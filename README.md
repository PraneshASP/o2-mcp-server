# o2-mcp-server

MCP (Model Context Protocol) server for the [o2 Exchange](https://o2.app) - A fully on-chain DEX on the Fuel Network. Provides AI agents with trading capabilities, market data access, and technical analysis tools.

## Features
- **Account Management** - Create trading sessions, check balances, manage sessions
- **Trading Operations** - Place, cancel orders with session-based authentication
- **Market Data** - Real-time tickers, order books, trade history, and candlestick data
- **Technical Analysis** - 16+ indicators (RSI, MACD, ADX, BBands, VWAP, etc.) with snapshot/window modes

## Available Tools

| Tool | Description |
|------|-------------|
| `o2_markets_list` | List all available trading markets |
| `o2_market_ticker` | Get real-time market ticker data |
| `o2_depth` | Fetch order book depth (bids/asks) |
| `o2_trades` | Get recent trade history |
| `o2_indicators` | Calculate technical indicators (RSI, MACD, ADX, BBands, VWAP, etc.) |
| `o2_account_create` | Create a new trading account |
| `o2_balance` | Check asset balance in trading account |
| `o2_session_create` | Create trading session with owner key |
| `o2_sessions_list` | List all stored sessions |
| `o2_session_get` | Get details of a specific session |
| `o2_place_order` | Place orders (Spot, Market, FillOrKill, PostOnly) |
| `o2_cancel_order` | Cancel an existing order |
| `o2_orders` | Get order history with pagination |

## Installation

```bash
bun install
bun run build
```

## Configuration

### Environment Variables

```bash
O2_NETWORK=devnet               # devnet (default), testnet, or mainnet
O2_PRIVATE_KEY=<your_key>       # Owner private key for trading
```

> **Note:** Trading sessions are automatically created and stored in `~/.o2-mcp/sessions.json` for reuse across sessions.

### Claude Code

```bash
claude mcp add-json o2-mcp-server '{
  "type": "stdio",
  "command": "node",
  "args": ["/path/to/o2-mcp/dist/stdio.js"],
  "env": {
    "O2_NETWORK": "devnet",
    "O2_PRIVATE_KEY": "your_private_key"
  }
}'
```

### Codex

Add to `.codex/config.toml`:

```toml
[mcp_servers.o2_mcp]
command = "node"
args = ["/path/to/o2-mcp/dist/stdio.js"]
env = { O2_NETWORK = "devnet", O2_PRIVATE_KEY = "your_private_key" }
```

### Other MCP Clients

Add to your MCP client config (e.g., `mcp.json`):

```json
{
  "mcpServers": {
    "o2-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/o2-mcp/dist/stdio.js"],
      "env": {
        "O2_NETWORK": "devnet",
        "O2_PRIVATE_KEY": "your_private_key"
      }
    }
  }
}
```

## Usage

#### IMPORTANT: **Always ask the agent to create a trading account and session before making trades. Each session lives upto 48 hours**

### Technical Analysis with Indicators

```javascript
// Get comprehensive technical indicators for ETH/USDC
{
  marketId: "0x09c17f779eb0a7658424e48935b2bef24013766f8b3da757becb2264406f9e96",
  indicators: ["rsi_14", "macd", "adx_14", "bbands", "vwap", "stoch"],
  resolution: "5m",
  period: "24h",
  mode: "snapshot",
  microSummary: true
}

// Returns: Current indicator values, trend bias, momentum, volatility assessment
```

### Place Order  

```javascript
// Buy 5 USDC worth of FUEL at 1.50 USDC per token
{
  tradeAccountId: "0x...",
  pair: ["FUEL", "USDC"],
  side: "Buy",
  orderType: "Spot",
  rawPrice: "1.50",
  rawQuantity: "5.0",
  sessionId: "session_123"
}
```

### Market Data

```javascript
// Get ETH/USDC ticker
{
  marketId: "0x09c17f779eb0a7658424e48935b2bef24013766f8b3da757becb2264406f9e96"
}

// Get order book depth
{
  marketId: "0x09c17f779eb0a7658424e48935b2bef24013766f8b3da757becb2264406f9e96",
  precision: "2"
}
```

## AI Prompts

### Analyze Market

Comprehensive technical analysis of a market.

```bash
/o2-mcp:Analyze_Market <market_id> <period>
```

Example:
```bash
/o2-mcp:Analyze_Market 0x09c17f779eb0a7658424e48935b2bef24013766f8b3da757becb2264406f9e96 24h
```

Analyzes trend, momentum, volatility, support/resistance, and provides trading recommendations.

## Technical Indicators

Supported indicators with `o2_indicators` tool:

**Moving Averages**: `sma_20`, `sma_50`, `ema_12`, `ema_26`, `vwap`

**Momentum**: `rsi_14`, `mfi_14`, `cci_20`, `stoch`

**Trend**: `adx_14`, `plus_di`, `minus_di`, `macd`

**Volatility**: `bbands`, `atr_14`

**Volume**: `obv`

### Snapshot Mode (Default)
Returns latest values with metadata, previous values, deltas, and derived fields (%B, bandwidth, ATR distances).

### Window Mode
Returns arrays of historical values aligned to timestamps for charting and analysis.

## Order Types

- **Spot**: Standard limit order (default)
- **Market**: Execute at best available price
- **FillOrKill**: Fill completely or cancel (no partial fills)
- **PostOnly**: Maker-only order (adds liquidity)


## Learn More

- [o2 Exchange](https://o2.app)
- [Fuel Network](https://fuel.network)
- [xmcp Documentation](https://xmcp.dev/docs)
- [Model Context Protocol](https://modelcontextprotocol.io)
