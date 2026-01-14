import Decimal from 'decimal.js';
import talib from 'talib';

export interface RawBar {
  buy_volume: string;
  close: string;
  high: string;
  low: string;
  open: string;
  sell_volume: string;
  timestamp: number;
}

export interface TransformedBars {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  timestamp: number[];
}

export interface IndicatorResult {
  value: any;
  prev?: any;
  delta?: any;
  levels?: Record<string, number>;
  meta: {
    requiredBars: number;
    providedBars: number;
    warmupBars: number;
    [key: string]: any;
  };
  error?: string;
}

export interface MicroSummary {
  trendBias: 'bullish' | 'bearish' | 'neutral';
  trendStrength: 'strong' | 'moderate' | 'weak';
  momentum: 'positive_strong' | 'positive_weakening' | 'negative_strong' | 'negative_weakening' | 'neutral';
  volatility: 'low' | 'moderate' | 'high';
  inputs: string[];
}

export interface TransformOptions {
  priceDecimals?: number;
  volumeDecimals?: number;
  priceSource?: 'close' | 'hlc3' | 'ohlc4';
}

function scaleDown(value: string | number, decimals: number): number {
  if (decimals === 0) {
    return typeof value === 'string' ? parseFloat(value) : value;
  }
  const decimal = new Decimal(value);
  const divisor = new Decimal(10).pow(decimals);
  return decimal.div(divisor).toNumber();
}

export function transformBarsToArrays(
  bars: RawBar[],
  options: TransformOptions = {}
): TransformedBars {
  const { priceDecimals = 9, volumeDecimals = 9 } = options;

  const result: TransformedBars = {
    open: [],
    high: [],
    low: [],
    close: [],
    volume: [],
    timestamp: [],
  };

  for (const bar of bars) {
    result.open.push(scaleDown(bar.open, priceDecimals));
    result.high.push(scaleDown(bar.high, priceDecimals));
    result.low.push(scaleDown(bar.low, priceDecimals));
    result.close.push(scaleDown(bar.close, priceDecimals));

    const totalVolume = new Decimal(bar.buy_volume).add(new Decimal(bar.sell_volume));
    result.volume.push(scaleDown(totalVolume.toString(), volumeDecimals));

    result.timestamp.push(bar.timestamp);
  }

  return result;
}

function getPriceArray(bars: TransformedBars, source: 'close' | 'hlc3' | 'ohlc4'): number[] {
  switch (source) {
    case 'close':
      return bars.close;
    case 'hlc3':
      return bars.high.map((h, i) => (h + bars.low[i] + bars.close[i]) / 3);
    case 'ohlc4':
      return bars.high.map((h, i) => (bars.open[i] + h + bars.low[i] + bars.close[i]) / 4);
  }
}

export function getIndicatorLookback(indicator: string): number {
  const normalized = indicator.toLowerCase().replace(/-/g, '_');

  if (normalized.startsWith('sma_')) {
    const period = parseInt(normalized.split('_')[1]) || 20;
    return period;
  }
  if (normalized.startsWith('ema_')) {
    const period = parseInt(normalized.split('_')[1]) || 12;
    return period * 2;
  }
  if (normalized.startsWith('rsi_')) {
    const period = parseInt(normalized.split('_')[1]) || 14;
    return period + 1;
  }
  if (normalized === 'macd' || normalized.startsWith('macd_')) {
    return 35;
  }
  if (normalized.startsWith('bbands')) {
    return 20;
  }
  if (normalized.startsWith('atr_')) {
    return 14;
  }
  if (normalized.startsWith('adx_')) {
    const period = parseInt(normalized.split('_')[1]) || 14;
    return period * 2;
  }
  if (normalized === 'plus_di' || normalized === 'minus_di') {
    return 28;
  }
  if (normalized === 'vwap') {
    return 1;
  }
  if (normalized.startsWith('cci_')) {
    return 20;
  }
  if (normalized === 'stoch') {
    return 14;
  }
  if (normalized.startsWith('mfi_')) {
    return 14;
  }
  if (normalized === 'obv') {
    return 1;
  }

  return 50;
}

export function calculateIndicator(
  indicator: string,
  bars: TransformedBars,
  options: TransformOptions = {}
): IndicatorResult | null {
  const normalized = indicator.toLowerCase().replace(/-/g, '_');
  const endIdx = bars.close.length - 1;
  const priceSource = options.priceSource || 'close';
  const priceArray = getPriceArray(bars, priceSource);

  try {
    if (normalized.startsWith('sma_')) {
      const period = parseInt(normalized.split('_')[1]) || 20;
      if (bars.close.length < period) return null;

      const result = talib.execute({
        name: 'SMA',
        startIdx: 0,
        endIdx: endIdx,
        inReal: priceArray,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        meta: {
          requiredBars: period,
          providedBars: bars.close.length,
          warmupBars: period - 1,
          period
        }
      };
    }

    if (normalized.startsWith('ema_')) {
      const period = parseInt(normalized.split('_')[1]) || 12;
      if (bars.close.length < period) return null;

      const result = talib.execute({
        name: 'EMA',
        startIdx: 0,
        endIdx: endIdx,
        inReal: priceArray,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        meta: {
          requiredBars: period * 2,
          providedBars: bars.close.length,
          warmupBars: Math.floor(period * 1.5),
          period
        }
      };
    }

    if (normalized.startsWith('rsi_')) {
      const period = parseInt(normalized.split('_')[1]) || 14;
      if (bars.close.length < period + 1) return null;

      const result = talib.execute({
        name: 'RSI',
        startIdx: 0,
        endIdx: endIdx,
        inReal: priceArray,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        levels: { overbought: 70, oversold: 30 },
        meta: {
          requiredBars: period + 1,
          providedBars: bars.close.length,
          warmupBars: period,
          period
        }
      };
    }

    if (normalized === 'macd' || normalized.startsWith('macd_')) {
      if (bars.close.length < 35) return null;

      const result = talib.execute({
        name: 'MACD',
        startIdx: 0,
        endIdx: endIdx,
        inReal: priceArray,
        optInFastPeriod: 12,
        optInSlowPeriod: 26,
        optInSignalPeriod: 9
      });

      const macdValues = result.result.outMACD;
      const signalValues = result.result.outMACDSignal;
      const histValues = result.result.outMACDHist;

      return {
        value: {
          macd: macdValues[macdValues.length - 1],
          signal: signalValues[signalValues.length - 1],
          histogram: histValues[histValues.length - 1]
        },
        prev: macdValues.length > 1 ? {
          macd: macdValues[macdValues.length - 2],
          signal: signalValues[signalValues.length - 2],
          histogram: histValues[histValues.length - 2]
        } : null,
        delta: macdValues.length > 1 ? {
          macd: macdValues[macdValues.length - 1] - macdValues[macdValues.length - 2],
          signal: signalValues[signalValues.length - 1] - signalValues[signalValues.length - 2],
          histogram: histValues[histValues.length - 1] - histValues[histValues.length - 2]
        } : null,
        meta: {
          requiredBars: 35,
          providedBars: bars.close.length,
          warmupBars: 33,
          fast: 12,
          slow: 26,
          signal: 9
        }
      };
    }

    if (normalized === 'bbands' || normalized.startsWith('bbands_')) {
      const period = 20;
      const stdDev = 2;
      if (bars.close.length < period) return null;

      const result = talib.execute({
        name: 'BBANDS',
        startIdx: 0,
        endIdx: endIdx,
        inReal: priceArray,
        optInTimePeriod: period,
        optInNbDevUp: stdDev,
        optInNbDevDn: stdDev,
        optInMAType: 0
      });

      const upper = result.result.outRealUpperBand;
      const middle = result.result.outRealMiddleBand;
      const lower = result.result.outRealLowerBand;

      const currentPrice = bars.close[bars.close.length - 1];
      const percentB = (currentPrice - lower[lower.length - 1]) / (upper[upper.length - 1] - lower[lower.length - 1]);
      const bandwidth = ((upper[upper.length - 1] - lower[lower.length - 1]) / middle[middle.length - 1]) * 100;

      return {
        value: {
          upper: upper[upper.length - 1],
          middle: middle[middle.length - 1],
          lower: lower[lower.length - 1],
          percentB: percentB,
          bandwidth: bandwidth
        },
        prev: upper.length > 1 ? {
          upper: upper[upper.length - 2],
          middle: middle[middle.length - 2],
          lower: lower[lower.length - 2]
        } : null,
        meta: {
          requiredBars: period,
          providedBars: bars.close.length,
          warmupBars: period - 1,
          period,
          stdDev
        }
      };
    }

    if (normalized.startsWith('atr_')) {
      const period = parseInt(normalized.split('_')[1]) || 14;
      if (bars.close.length < period) return null;

      const result = talib.execute({
        name: 'ATR',
        startIdx: 0,
        endIdx: endIdx,
        high: bars.high,
        low: bars.low,
        close: bars.close,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        meta: {
          requiredBars: period,
          providedBars: bars.close.length,
          warmupBars: period - 1,
          period
        }
      };
    }

    if (normalized.startsWith('adx_')) {
      const period = parseInt(normalized.split('_')[1]) || 14;
      if (bars.close.length < period * 2) return null;

      const result = talib.execute({
        name: 'ADX',
        startIdx: 0,
        endIdx: endIdx,
        high: bars.high,
        low: bars.low,
        close: bars.close,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        levels: { strong: 25, weak: 15 },
        meta: {
          requiredBars: period * 2,
          providedBars: bars.close.length,
          warmupBars: period * 2 - 1,
          period
        }
      };
    }

    if (normalized === 'plus_di' || normalized === 'plusdi') {
      const period = 14;
      if (bars.close.length < period * 2) return null;

      const result = talib.execute({
        name: 'PLUS_DI',
        startIdx: 0,
        endIdx: endIdx,
        high: bars.high,
        low: bars.low,
        close: bars.close,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        meta: {
          requiredBars: period * 2,
          providedBars: bars.close.length,
          warmupBars: period * 2 - 1,
          period
        }
      };
    }

    if (normalized === 'minus_di' || normalized === 'minusdi') {
      const period = 14;
      if (bars.close.length < period * 2) return null;

      const result = talib.execute({
        name: 'MINUS_DI',
        startIdx: 0,
        endIdx: endIdx,
        high: bars.high,
        low: bars.low,
        close: bars.close,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        meta: {
          requiredBars: period * 2,
          providedBars: bars.close.length,
          warmupBars: period * 2 - 1,
          period
        }
      };
    }

    if (normalized === 'vwap') {
      if (bars.close.length < 1) return null;

      const vwapValues: number[] = [];
      let cumulativePV = 0;
      let cumulativeVolume = 0;

      for (let i = 0; i < bars.close.length; i++) {
        const typicalPrice = (bars.high[i] + bars.low[i] + bars.close[i]) / 3;
        cumulativePV += typicalPrice * bars.volume[i];
        cumulativeVolume += bars.volume[i];
        vwapValues.push(cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : typicalPrice);
      }

      return {
        value: vwapValues[vwapValues.length - 1],
        prev: vwapValues.length > 1 ? vwapValues[vwapValues.length - 2] : null,
        delta: vwapValues.length > 1 ? vwapValues[vwapValues.length - 1] - vwapValues[vwapValues.length - 2] : null,
        meta: {
          requiredBars: 1,
          providedBars: bars.close.length,
          warmupBars: 0,
          anchor: 'window'
        }
      };
    }

    if (normalized.startsWith('cci_')) {
      const period = parseInt(normalized.split('_')[1]) || 20;
      if (bars.close.length < period) return null;

      const result = talib.execute({
        name: 'CCI',
        startIdx: 0,
        endIdx: endIdx,
        high: bars.high,
        low: bars.low,
        close: bars.close,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        levels: { overbought: 100, oversold: -100 },
        meta: {
          requiredBars: period,
          providedBars: bars.close.length,
          warmupBars: period - 1,
          period
        }
      };
    }

    if (normalized === 'stoch') {
      const period = 14;
      if (bars.close.length < period) return null;

      const result = talib.execute({
        name: 'STOCH',
        startIdx: 0,
        endIdx: endIdx,
        high: bars.high,
        low: bars.low,
        close: bars.close,
        optInFastK_Period: 14,
        optInSlowK_Period: 3,
        optInSlowK_MAType: 0,
        optInSlowD_Period: 3,
        optInSlowD_MAType: 0
      });

      const kValues = result.result.outSlowK;
      const dValues = result.result.outSlowD;

      return {
        value: {
          k: kValues[kValues.length - 1],
          d: dValues[dValues.length - 1]
        },
        prev: kValues.length > 1 ? {
          k: kValues[kValues.length - 2],
          d: dValues[dValues.length - 2]
        } : null,
        delta: kValues.length > 1 ? {
          k: kValues[kValues.length - 1] - kValues[kValues.length - 2],
          d: dValues[dValues.length - 1] - dValues[dValues.length - 2]
        } : null,
        levels: { overbought: 80, oversold: 20 },
        meta: {
          requiredBars: period,
          providedBars: bars.close.length,
          warmupBars: period - 1,
          fastK: 14,
          slowK: 3,
          slowD: 3
        }
      };
    }

    if (normalized.startsWith('mfi_')) {
      const period = parseInt(normalized.split('_')[1]) || 14;
      if (bars.close.length < period) return null;

      const result = talib.execute({
        name: 'MFI',
        startIdx: 0,
        endIdx: endIdx,
        high: bars.high,
        low: bars.low,
        close: bars.close,
        volume: bars.volume,
        optInTimePeriod: period
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        levels: { overbought: 80, oversold: 20 },
        meta: {
          requiredBars: period,
          providedBars: bars.close.length,
          warmupBars: period - 1,
          period
        }
      };
    }

    if (normalized === 'obv') {
      if (bars.close.length < 1) return null;

      const result = talib.execute({
        name: 'OBV',
        startIdx: 0,
        endIdx: endIdx,
        inReal: bars.close,
        volume: bars.volume
      });

      const values = result.result.outReal;
      return {
        value: values[values.length - 1],
        prev: values.length > 1 ? values[values.length - 2] : null,
        delta: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : null,
        meta: {
          requiredBars: 1,
          providedBars: bars.close.length,
          warmupBars: 0
        }
      };
    }

    return null;
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : String(error),
      meta: {
        requiredBars: getIndicatorLookback(indicator),
        providedBars: bars.close.length,
        warmupBars: 0
      }
    };
  }
}

export function computeDerivedFields(
  indicators: Record<string, IndicatorResult | null>,
  currentPrice: number
): Record<string, number> {
  const derived: Record<string, number> = {};

  const atr = indicators['atr_14'];
  const sma20 = indicators['sma_20'];
  const vwap = indicators['vwap'];

  if (atr && atr.value && typeof atr.value === 'number' && atr.value > 0) {
    if (sma20 && sma20.value && typeof sma20.value === 'number') {
      derived.dist_sma20_atr = (currentPrice - sma20.value) / atr.value;
    }

    if (vwap && vwap.value && typeof vwap.value === 'number') {
      derived.dist_vwap_atr = (currentPrice - vwap.value) / atr.value;
    }
  }

  return derived;
}

export function generateMicroSummary(
  indicators: Record<string, IndicatorResult | null>,
  currentPrice: number
): MicroSummary {
  const inputs: string[] = [];

  const sma20 = indicators['sma_20'];
  const sma50 = indicators['sma_50'];
  const adx = indicators['adx_14'];
  const plusDI = indicators['plus_di'];
  const minusDI = indicators['minus_di'];
  const rsi = indicators['rsi_14'];
  const macd = indicators['macd'];
  const atr = indicators['atr_14'];
  const bbands = indicators['bbands'];

  let trendBias: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let trendStrength: 'strong' | 'moderate' | 'weak' = 'weak';
  let momentum: MicroSummary['momentum'] = 'neutral';
  let volatility: 'low' | 'moderate' | 'high' = 'moderate';

  if (sma20 && sma50 && typeof sma20.value === 'number' && typeof sma50.value === 'number') {
    if (currentPrice > sma20.value && sma20.value > sma50.value) {
      trendBias = 'bullish';
      inputs.push('price>sma20>sma50');
    } else if (currentPrice < sma20.value && sma20.value < sma50.value) {
      trendBias = 'bearish';
      inputs.push('price<sma20<sma50');
    }
  }

  if (plusDI && minusDI && typeof plusDI.value === 'number' && typeof minusDI.value === 'number') {
    if (plusDI.value > minusDI.value) {
      if (trendBias === 'bearish') trendBias = 'neutral';
      else if (trendBias === 'neutral') trendBias = 'bullish';
      inputs.push('+di>-di');
    } else {
      if (trendBias === 'bullish') trendBias = 'neutral';
      else if (trendBias === 'neutral') trendBias = 'bearish';
      inputs.push('+di<-di');
    }
  }

  if (adx && typeof adx.value === 'number') {
    if (adx.value > 25) {
      trendStrength = 'strong';
      inputs.push('adx>25');
    } else if (adx.value > 15) {
      trendStrength = 'moderate';
      inputs.push('adx>15');
    } else {
      trendStrength = 'weak';
      inputs.push('adx<15');
    }
  }

  if (rsi && macd && typeof rsi.value === 'number' && macd.value && typeof macd.value.histogram === 'number') {
    const rsiDelta = rsi.delta && typeof rsi.delta === 'number' ? rsi.delta : 0;
    const macdHist = macd.value.histogram;
    const macdDelta = macd.delta && typeof macd.delta.histogram === 'number' ? macd.delta.histogram : 0;

    if (rsi.value > 50 && macdHist > 0) {
      momentum = macdDelta > 0 ? 'positive_strong' : 'positive_weakening';
      inputs.push(macdDelta > 0 ? 'macd_hist>0_rising' : 'macd_hist>0_falling');
    } else if (rsi.value < 50 && macdHist < 0) {
      momentum = macdDelta < 0 ? 'negative_strong' : 'negative_weakening';
      inputs.push(macdDelta < 0 ? 'macd_hist<0_falling' : 'macd_hist<0_rising');
    }
  }

  if (atr && bbands && typeof atr.value === 'number' && bbands.value) {
    const atrPct = (atr.value / currentPrice) * 100;
    const bandwidth = typeof bbands.value.bandwidth === 'number' ? bbands.value.bandwidth : 0;

    if (atrPct < 1 && bandwidth < 2) {
      volatility = 'low';
      inputs.push('low_volatility');
    } else if (atrPct > 3 || bandwidth > 5) {
      volatility = 'high';
      inputs.push('high_volatility');
    } else {
      volatility = 'moderate';
    }
  }

  return {
    trendBias,
    trendStrength,
    momentum,
    volatility,
    inputs
  };
}
