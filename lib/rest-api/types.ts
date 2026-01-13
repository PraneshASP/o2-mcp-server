import { RawAxiosRequestConfig } from 'axios';
import type { Account, B256Address, Address, BN, AbstractContract } from 'fuels';
import { BigNumberish } from 'ethers';

import { Enum } from '../types/contracts/common';
import type { SignatureInput } from '../types/contracts/TradeAccount';

import type { Trade, Identity, DepthOrder, Order, OrderBookBalance } from '../types';

// ------- General Rest API -------

/**
 * Logger interface for logging warnings and errors
 */
export interface Logger {
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  info?(message: string, ...args: any[]): void;
  debug?(message: string, ...args: any[]): void;
}

/**
 * Represents the arguments for an Axios request.
 * @property {string} url - The URL for the request.
 * @property {RawAxiosRequestConfig} options - The options for the Axios request.
 */
export interface AxiosRequestArgs {
  url: string;
  options: RawAxiosRequestConfig;
}

/**
 * Represents the response from a REST API request.
 * @template T - The type of the data returned in the response.
 * @property {() => Promise<T>} data - A function that returns a Promise resolving to the data from the API response.
 * @property {number} status - The HTTP status code of the response.
 */
export type RestApiResponse<T> = {
  data: () => Promise<T>;
  status: number;
};

export class ConfigurationRestAPI {
  /**
   * override base path
   * @type {string}
   * @memberof ConfigurationRestAPI
   */
  basePath?: string;

  /**
   * set a timeout (in milliseconds) for the request
   * @default 1000
   * @type {number}
   * @memberof ConfigurationRestAPI
   */
  timeout: number;

  /**
   * number of retry attempts for failed requests
   * @default 3
   * @type {number}
   * @memberof ConfigurationRestAPI
   */
  retries: number;

  /**
   * delay between retry attempts in milliseconds
   * @default 1000
   * @type {number}
   * @memberof ConfigurationRestAPI
   */
  backoff: number;

  /**
   * base options for axios calls
   * @type {Record<string, unknown>}
   * @memberof ConfigurationRestAPI
   * @internal
   */
  baseOptions: Record<string, unknown>;

  /**
   * logger for warnings and errors
   * defaults to console if not provided
   * @type {Logger}
   * @memberof ConfigurationRestAPI
   */
  logger: Logger;

  /**
   * custom error handler for API errors
   * receives the error and a retry function
   * should return true if the error was handled and request should be retried
   * @type {((error: any) => Promise<boolean>) | undefined}
   * @memberof ConfigurationRestAPI
   * @internal
   */
  errorHandler?: (error: any) => Promise<boolean>;

  constructor(param: Partial<ConfigurationRestAPI> = {}) {
    this.basePath = param.basePath;
    this.retries = param.retries ?? 3;
    this.timeout = param.timeout ?? 1000;
    this.backoff = param.backoff ?? 1000;
    this.errorHandler = param.errorHandler;
    this.logger = param.logger ?? console;

    this.baseOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
}

// ------- General Types -------

export type BigInterish = BigNumberish | bigint | BN;

export type Signature = Enum<{
  Secp256k1: string;
  Secp256r1: string;
  Ed25519: string;
}>;

export interface SessionSigner {
  address: Address;
  sign(data: Uint8Array): Promise<SignatureInput>;
}

export enum Action {
  CreateOrder = 'create_order',
  CancelOrder = 'cancel_order',
  GetBars = 'get_bars',
  GetTrades = 'get_trades',
  GetDepth = 'depth',
  GetTradesByAccount = 'get_trades_by_account',
}

export type API_Signature = Enum<{
  Secp256k1: string;
  Secp256r1: string;
  Ed25519: string;
}>;

export type MarketId = `0x${string}`;

// ------- Market Types -------

export interface MarketConfig {
  chainId: BigNumberish;
  contractId: B256Address;
  baseAssetId: B256Address;
  quoteAssetId: B256Address;
  baseDecimals: number;
  quoteDecimals: number;
}

// ------- Trade Account Manager -------

export type TradeAccountManagerConfig = {
  signer: SessionSigner;
  account: Account;
  tradeAccountId?: B256Address;
  contractIds?: string[];
  defaultGasLimit?: BigInterish;
};

// ------- OrderBook Types -------

export enum OrderType {
  Spot = 'Spot',
  Market = 'Market',
  Limit = 'Limit',
  FillOrKill = 'FillOrKill',
  PostOnly = 'PostOnly',
}

export enum OrderSide {
  Buy = 'Buy',
  Sell = 'Sell',
}

export type OrderBookConfig = {
  baseAssetId: B256Address;
  quoteAssetId: B256Address;
  baseDecimals: number;
  quoteDecimals: number;
};

// ------- Account API Types -------

export interface CreateTradingAccountRequest {
  readonly address: string;
}

export interface CreateTradingAccountResponse {
  readonly trade_account_id: string;
}

export interface CreateSessionRequest {
  contractIds: string[];
  expiry?: BigInterish;
}

export interface API_CreateSessionRequest {
  readonly nonce: string;
  readonly contract_id: string;
  readonly session_id: Identity;
  readonly contract_ids: string[];
  readonly signature: Signature;
  readonly expiry: string;
}

// ------- Session API Types -------

export interface CancelOrderAction {
  CancelOrder: {
    order_id: `0x${string}`;
  };
}

export interface CreateOrderAction {
  CreateOrder: {
    side: OrderSide;
    order_type: OrderType;
    price: string;
    quantity: string;
  };
}

export interface SettleBalanceAction {
  SettleBalance: {
    to: Identity;
  };
}

export type SessionAction = CancelOrderAction | CreateOrderAction | SettleBalanceAction;

export interface SessionActionBatch {
  market: MarketResponse;
  actions: SessionAction[];
}

export type CallParams = {
  coins: string;
  asset_id: BN;
  gas: BN;
};

export interface CallContractArg {
  contract_id: string;
  function_selector: Uint8Array;
  call_params: CallParams;
  call_data?: Uint8Array;
}

export interface CallContractArgParams {
  contracts: AbstractContract[];
  callContractArgBytes: Uint8Array;
  variableOutputs: number;
  callContractArg: CallContractArg;
}

export type SessionCallContractArg = {
  contractId: string;
  functionSelector: string;
  amount: BN;
  assetId: string;
  gas: BN;
  args?: Uint8Array;
};

export interface API_CreateCallContractCallRequest {
  coins: string;
  asset_id: B256Address;
  gas: string;
}

export interface API_CreateCallContractArgRequest {
  contract_id: string;
  function_selector: string;
  call_data?: string;
  call_params: API_CreateCallContractCallRequest;
}

export interface API_CallContractRequest {
  nonce: string;
  trade_account_id: B256Address;
  signature: Signature;
  call: API_CreateCallContractArgRequest;
  contracts?: B256Address[];
  variable_outputs: number;
  min_gas_limit?: string;
}

export interface API_SessionCallContractRequest {
  nonce: string;
  session_id: Identity;
  trade_account_id: B256Address;
  signature: Signature;
  call?: API_CreateCallContractArgRequest;
  calls?: API_CreateCallContractArgRequest[];
  contracts?: B256Address[];
  variable_outputs: number;
  min_gas_limit?: string;
  market_id?: string;
}

interface SessionActionBatchAPI {
  market_id: MarketId;
  actions: SessionAction[];
}

export interface SessionActionBatchRequest {
  market: MarketResponse;
  actions: SessionAction[];
}

export interface SessionSubmitTransactionRequest {
  actions: SessionActionBatchAPI[];
  signature: API_Signature;
  nonce: string;
  trade_account_id: string;
  session_id: Identity;
  variable_outputs?: number;
  min_gas_limit?: string;
  collect_orders?: boolean;
}

export interface SessionSubmitTransactionResponse {
  // Only newly created orders will return an element
  // collect_orders must be set to true in the request
  orders: {
    order_id: string;
  }[];
  tx_id: string;
}

// ------- Market API Types -------

export type MarketResponse = {
  market_id: string;
  contract_id: string;
  taker_fee: string;
  maker_fee: string;
  min_order: string;
  dust: string;
  base: {
    symbol: string;
    asset: string;
    decimals: number;
    min_precision: number;
    max_precision: number;
  };
  quote: {
    symbol: string;
    asset: string;
    decimals: number;
    min_precision: number;
    max_precision: number;
  };
};

export type MarketsResponse = {
  markets: MarketResponse[];
};

export interface GetTickerRequest {
  market_id: string;
}

export interface Ticker {
  ask: string;
  ask_volume: string;
  average: string;
  base_volume: string;
  bid: string;
  bid_volume: string;
  change: string;
  close: string;
  high: string;
  last: string;
  low: string;
  open: string;
  percentage: string;
  previous_close: string;
  quote_volume: string;
  timestamp: string;
}

export type GetTickerResponse = Ticker[];

export interface GetSummaryRequest {
  market_id: string;
}

export interface Summary {
  change_24h: string;
  high_price: string;
  last_price: string;
  low_price: string;
  market_id: string;
  volume_24h: string;
}

export type GetSummaryResponse = Summary[];

// ------- Bars API Types -------

export enum BarResolution {
  OneSecond = '1s',
  OneMinute = '1m',
  TwoMinutes = '2m',
  ThreeMinutes = '3m',
  FiveMinutes = '5m',
  FifteenMinutes = '15m',
  ThirtyMinutes = '30m',
  OneHour = '1h',
  TwoHours = '2h',
  FourHours = '4h',
  SixHours = '6h',
  EightHours = '8h',
  TwelveHours = '12h',
  OneDay = '1d',
  ThreeDays = '3d',
  OneWeek = '1w',
  OneMonth = '1M',
  ThreeMonths = '3M',
}

export interface GetBarsCountBack {
  market_id: string;
  count_back: number;
  to: number; // in ms
  resolution: BarResolution;
}

export interface GetBarsFromTo {
  market_id: string;
  from: number; // in ms
  to: number; // in ms
  resolution: BarResolution;
}

export type GetBarsRequest = GetBarsCountBack | GetBarsFromTo;

export interface Bar {
  open: string;
  high: string;
  low: string;
  close: string;
  buy_volume: string;
  sell_volume: string;
  timestamp: number;
}

export interface GetBarsResponse {
  action: Action.GetBars;
  market_id: string;
  bars: Bar[];
}

// ------- Balance API Types -------

export interface GetBalanceRequest {
  asset_id: string;
  contract?: string;
}

export interface GetBalanceResponse {
  order_books: Record<string, OrderBookBalance>;
  total_fee: string;
  total_locked: string;
  total_unlocked: string;
  trading_account_balance: string;
}

// ------- Trades API Types -------

export interface GetTradesRequest {
  market_id: string;
  direction?: 'asc' | 'desc';
  count?: number;
}

export interface GetTradesResponse {
  action: Action.GetTrades;
  market_id: string;
  trades: Trade[];
}

export interface GetTradesByAccountRequest {
  market_id: string;
  contract?: string;
  direction?: 'asc' | 'desc';
  count: number;
}

export interface AccountTrade extends Trade {
  trader_side: 'taker' | 'maker';
}

export interface GetTradesByAccountResponse {
  action: Action.GetTradesByAccount;
  market_id: string;
  trades: AccountTrade[];
}

// ------- Depth API Types -------

export interface GetDepthRequest {
  market_id: string;
  precision: number;
}

export interface GetDepthResponse {
  action: Action.GetDepth;
  market_id: string;
  orders: {
    buys: DepthOrder[];
    sells: DepthOrder[];
  };
}

// ------- Orders API Types -------

export interface GetOrdersRequest {
  market_id: string;
  contract?: string;
  count: number;
  direction: 'asc' | 'desc';
  is_open: boolean;
}

export interface GetOrdersResponse {
  identity: Identity;
  market_id: string;
  orders: Order[];
}

export interface GetOrderRequest {
  order_id: string;
  market_id: string;
}

export interface GetOrderResponse {
  order: Order;
}
