import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  marketId: z.string().describe("Market ID to analyze"),
  period: z
    .enum(["1h", "24h", "7d", "30d"])
    .optional()
    .describe("Time period to analyze (default: 24h)"),
  resolution: z
    .enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"])
    .optional()
    .describe("Timeframe for analysis (default: 5m)"),
};

export const metadata: PromptMetadata = {
  name: "analyze-market",
  title: "Analyze_Market",
  description:
    "Comprehensive technical analysis of a market using multiple indicators",
  role: "user",
};

export default function analyzeMarket({
  marketId,
  period = "24h",
  resolution = "5m",
}: InferSchema<typeof schema>) {
  return `Perform a comprehensive technical analysis for ${marketId} on ${resolution} timeframe over the last ${period}.

Use the o2_indicators tool with the following configuration:
- Market: ${marketId}
- Resolution: ${resolution}
- Period: ${period}
- Mode: snapshot
- Include microSummary: true
- Indicators: ["rsi_14", "macd", "bbands", "atr_14", "adx_14", "plus_di", "minus_di", "sma_20", "sma_50", "ema_12", "ema_26", "vwap", "cci_20", "stoch", "mfi_14", "obv"]

Provide a detailed analysis covering:

1. Trend Analysis
   - Overall trend direction (bullish/bearish/neutral)
   - Trend strength using ADX
   - Directional indicators (+DI, -DI)
   - Moving average alignment (SMA 20, SMA 50, EMA 12, EMA 26)
   - Position relative to VWAP

2. Momentum Assessment
   - RSI levels and overbought/oversold conditions
   - MACD histogram and signal line crossovers
   - MFI (Money Flow Index) for volume-weighted momentum
   - CCI for cyclical patterns
   - Stochastic oscillator positioning

3. Volatility & Risk
   - ATR levels and recent volatility changes
   - Bollinger Bands positioning (%B and bandwidth)
   - Distance from key moving averages in ATR terms

4. Volume Analysis
   - OBV trend for accumulation/distribution
   - Volume patterns and anomalies

5. Key Levels
   - Support and resistance from Bollinger Bands
   - Moving average levels

6. Trading Outlook
   - Short-term bias (next few hours/candles)
   - Risk assessment
   - Potential entry/exit considerations
   - Confluence of signals

Format your analysis clearly with bullet points and specific values from the indicators.`;
}
