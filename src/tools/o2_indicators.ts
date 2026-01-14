import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";
import {
  transformBarsToArrays,
  calculateIndicator,
  computeDerivedFields,
  generateMicroSummary,
  getIndicatorLookback,
  type RawBar,
  type IndicatorResult,
} from "../lib/utils/indicators";

export const schema = {
  marketId: z
    .string()
    .describe("Market ID to fetch indicators for."),

  indicators: z
    .array(z.string())
    .describe(
      "Array of indicator names (e.g., ['rsi_14', 'macd', 'adx_14', 'vwap']). Supported: sma_20, sma_50, ema_12, ema_26, rsi_14, macd, bbands, atr_14, adx_14, plus_di, minus_di, vwap, cci_20, stoch, mfi_14, obv"
    ),

  resolution: z
    .enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"])
    .describe("Candlestick resolution/timeframe."),

  mode: z
    .enum(["snapshot", "window"])
    .describe(
      "Output mode: 'snapshot' returns latest values with metadata, 'window' returns arrays of values (default: snapshot)."
    )
    .optional(),

  period: z
    .enum(["1h", "24h", "7d", "30d"])
    .describe("Preset time period (default: 24h). Overridden by from/to.")
    .optional(),

  from: z
    .union([z.number(), z.string()])
    .describe("Start timestamp in ms. Overrides period.")
    .optional(),

  to: z
    .union([z.number(), z.string()])
    .describe("End timestamp in ms. Overrides period.")
    .optional(),

  windowSize: z
    .number()
    .max(500)
    .describe("Number of values to return in window mode (default: 100, max: 500).")
    .optional(),

  priceSource: z
    .enum(["close", "hlc3", "ohlc4"])
    .describe(
      "Price source for indicators: 'close' (default), 'hlc3' ((H+L+C)/3), or 'ohlc4' ((O+H+L+C)/4)."
    )
    .optional(),

  vwapAnchor: z
    .enum(["session", "window"])
    .describe(
      "VWAP anchoring: 'window' (rolling over fetched bars, default) or 'session' (reset at UTC 00:00)."
    )
    .optional(),

  strict: z
    .boolean()
    .describe(
      "If true, fail the entire request when any indicator cannot be computed. If false (default), return null with reason for failed indicators."
    )
    .optional(),

  asOf: z
    .union([z.number(), z.string()])
    .describe("Historical replay timestamp. If provided, fetch data up to this point.")
    .optional(),

  microSummary: z
    .boolean()
    .describe(
      "Include market regime summary (trendBias, trendStrength, momentum, volatility) derived from indicators (default: false)."
    )
    .optional(),

  includeIncompleteLastBar: z
    .boolean()
    .describe(
      "Include the last bar even if it's incomplete (default: false)."
    )
    .optional(),

  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_indicators",
  description:
    "Calculate technical indicators for a market. Returns indicators like RSI, MACD, ADX, Bollinger Bands, VWAP, and more. Supports both snapshot (latest values) and window (arrays) modes.",
  annotations: {
    title: "Get Technical Indicators",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

interface Warning {
  code: string;
  details?: Record<string, any>;
}

function normalizePeriod(period: string): { from: number; to: number } {
  const now = Date.now();
  const periods: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const duration = periods[period] || periods["24h"];
  return {
    from: now - duration,
    to: now,
  };
}

function normalizeIndicatorName(name: string): string {
  const aliases: Record<string, string> = {
    rsi14: "rsi_14",
    sma20: "sma_20",
    sma50: "sma_50",
    ema12: "ema_12",
    ema26: "ema_26",
    mfi14: "mfi_14",
    cci20: "cci_20",
    atr14: "atr_14",
    adx14: "adx_14",
    plusdi: "plus_di",
    minusdi: "minus_di",
    macd_12_26_9: "macd",
    bbands_20_2: "bbands",
    stoch_14_3_3: "stoch",
  };

  const lower = name.toLowerCase().replace(/-/g, "_");
  return aliases[lower] || lower;
}

export default async function o2_indicators({
  marketId,
  indicators: requestedIndicators,
  resolution,
  mode = "snapshot",
  period = "24h",
  from: fromParam,
  to: toParam,
  windowSize = 100,
  priceSource = "close",
  vwapAnchor = "window",
  strict = false,
  asOf,
  microSummary: includeMicroSummary = false,
  includeIncompleteLastBar = false,
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  const warnings: Warning[] = [];

  if (requestedIndicators.length > 20) {
    return toToolResponse({
      ok: false,
      error: "Too many indicators requested. Maximum is 20.",
    });
  }

  const normalizedIndicators = requestedIndicators.map(normalizeIndicatorName);

  const maxLookback = Math.max(
    ...normalizedIndicators.map((ind) => getIndicatorLookback(ind))
  );

  let from: number;
  let to: number;

  if (fromParam !== undefined && toParam !== undefined) {
    from = typeof fromParam === "string" ? parseInt(fromParam) : fromParam;
    to = typeof toParam === "string" ? parseInt(toParam) : toParam;
  } else {
    const normalized = normalizePeriod(period);
    from = normalized.from;
    to = normalized.to;
  }

  if (asOf !== undefined) {
    const asOfTs = typeof asOf === "string" ? parseInt(asOf) : asOf;
    to = asOfTs;
    warnings.push({
      code: "AS_OF_TIMESTAMP",
      details: { asOf: asOfTs },
    });
  }

  const requiredBars =
    mode === "window" ? maxLookback + windowSize : maxLookback + 50;

  try {
    const response = await o2RequestRaw({
      method: "GET",
      path: "/v1/bars",
      query: {
        market_id: marketId,
        resolution: resolution,
        count_back: requiredBars,
        from: from,
        to: to,
      },
      apiBaseUrl,
    });

    if (!response.ok) {
      return toToolResponse({
        ok: false,
        error: `API error: ${response.statusText}`,
        status: response.status,
      });
    }

    const data = response.data as { action: string; bars: RawBar[] };

    if (!data.bars || data.bars.length === 0) {
      return toToolResponse({
        ok: false,
        error: "No bars returned from API",
      });
    }

    let bars = data.bars;

    if (!includeIncompleteLastBar && bars.length > 0) {
      const lastBar = bars[bars.length - 1];
      const now = Date.now();
      const resolutionMs: Record<string, number> = {
        "1m": 60 * 1000,
        "5m": 5 * 60 * 1000,
        "15m": 15 * 60 * 1000,
        "30m": 30 * 60 * 1000,
        "1h": 60 * 60 * 1000,
        "4h": 4 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
        "1w": 7 * 24 * 60 * 60 * 1000,
      };

      const barDuration = resolutionMs[resolution] || resolutionMs["5m"];
      const isComplete = now - lastBar.timestamp >= barDuration;

      if (!isComplete) {
        bars = bars.slice(0, -1);
        warnings.push({
          code: "INCOMPLETE_LAST_BAR",
          details: { timestamp: lastBar.timestamp },
        });
      }
    }

    if (bars.length < maxLookback) {
      if (strict) {
        return toToolResponse({
          ok: false,
          error: `Insufficient bars. Required: ${maxLookback}, Available: ${bars.length}`,
        });
      }
      warnings.push({
        code: "INSUFFICIENT_BARS",
        details: { required: maxLookback, available: bars.length },
      });
    }

    const transformedBars = transformBarsToArrays(bars, { priceSource });

    const currentPrice = transformedBars.close[transformedBars.close.length - 1];

    const calculatedIndicators: Record<string, IndicatorResult | null> = {};

    for (const indicator of normalizedIndicators) {
      const result = calculateIndicator(indicator, transformedBars, {
        priceSource,
      });

      if (result === null) {
        if (strict) {
          return toToolResponse({
            ok: false,
            error: `Failed to calculate indicator: ${indicator}. Insufficient data.`,
          });
        }
        calculatedIndicators[indicator] = {
          value: null,
          error: "INSUFFICIENT_BARS",
          meta: {
            requiredBars: getIndicatorLookback(indicator),
            providedBars: bars.length,
            warmupBars: 0,
          },
        };
      } else if (result.error) {
        if (strict) {
          return toToolResponse({
            ok: false,
            error: `Failed to calculate indicator: ${indicator}. Error: ${result.error}`,
          });
        }
        calculatedIndicators[indicator] = result;
      } else {
        calculatedIndicators[indicator] = result;
      }
    }

    if (mode === "snapshot") {
      const derived = computeDerivedFields(calculatedIndicators, currentPrice);

      const formattedIndicators: Record<string, any> = {};
      for (const [key, result] of Object.entries(calculatedIndicators)) {
        if (result) {
          const { value, prev, delta, levels, meta, error } = result;
          formattedIndicators[key] = {
            ...(error ? { value: null, error } : { value, prev, delta }),
            ...(levels ? { levels } : {}),
            meta,
          };
        }
      }

      const output: any = {
        marketId,
        resolution,
        from,
        to,
        bars: bars.length,
        asOf: to,
        currentPrice,
        currentPriceSource: "last_close",
        warnings,
        indicators: formattedIndicators,
        derived,
      };

      if (includeMicroSummary) {
        output.microSummary = generateMicroSummary(
          calculatedIndicators,
          currentPrice
        );
      }

      return toToolResponse({
        ok: true,
        data: output,
      });
    } else {
      const timestamps = transformedBars.timestamp.slice(-windowSize);
      const windowIndicators: Record<string, any> = {};

      for (const [key, result] of Object.entries(calculatedIndicators)) {
        if (result && result.value !== null && !result.error) {
          windowIndicators[key] = result.value;
        } else {
          windowIndicators[key] = null;
        }
      }

      const output = {
        marketId,
        resolution,
        from,
        to,
        bars: timestamps.length,
        warnings,
        timestamps,
        indicators: windowIndicators,
      };

      return toToolResponse({
        ok: true,
        data: output,
      });
    }
  } catch (error) {
    return toToolResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
