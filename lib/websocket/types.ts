import type { Trade, Identity, DepthOrder, Order, OrderBookBalance } from '../types';

export enum SubscriptionFrequency {
  HundredMillis = '100ms',
  FiveHundredMillis = '500ms',
  OneSecond = '1s',
  ThreeSecond = '3s',
}

// ------- Subscription Params -------

export interface SubscribeBalancesParams {
  identities: Identity[];
}

export interface SubscribeTradesParams {
  market_id: string;
}

export interface SubscribeOrdersParams {
  identities: Identity[];
}

export interface SubscribeDepthParams {
  market_id: string;
  precision: string;
}

export interface SubscribeDepthViewParams {
  market_id: string;
  precision: string;
  frequency: SubscriptionFrequency;
}

// ------- Subscription Responses -------

export interface BalanceUpdate {
  action: 'subscribe_balances';
  balance: Array<{
    order_books: Record<string, OrderBookBalance>;
    identity: Identity;
    asset_id: string;
    total_locked: string;
    total_unlocked: string;
    trading_account_balance: string;
  }>;
  onchain_timestamp: string;
  seen_timestamp: string;
}

export interface TradeUpdate {
  action: 'subscribe_trades';
  trades: Trade[];
  market_id: string;
  onchain_timestamp: string;
  seen_timestamp: string;
}

export interface OrderUpdate {
  action: 'subscribe_orders';
  orders: Order[];
  onchain_timestamp: string;
  seen_timestamp: string;
}

export interface DepthUpdate {
  action: 'subscribe_depth';
  view: {
    precision: number;
    buys: DepthOrder[];
    sells: DepthOrder[];
  };
  market_id: string;
}

export interface DepthViewUpdate {
  action: 'subscribe_depth_view';
  view: {
    precision: number;
    buys: DepthOrder[];
    sells: DepthOrder[];
  };
  market_id: string;
}

// Event map for type-safe .on() handlers
export interface WsEventMap {
  subscribe_balances: BalanceUpdate;
  subscribe_trades: TradeUpdate;
  subscribe_orders: OrderUpdate;
  subscribe_depth: DepthUpdate;
  subscribe_depth_view: DepthViewUpdate;
  error: Error;
}

export type WsEventType = keyof WsEventMap;

export interface Logger {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  debug(...args: any[]): void;
}

export interface WsClientOptions {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  logger?: Logger;
}
