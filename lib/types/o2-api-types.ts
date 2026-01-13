import { Enum } from './contracts/common';

export type Identity = Enum<{
  Address: string;
  ContractId: string;
}>;

export interface Trade {
  price: string;
  quantity: string;
  side: 'buy' | 'sell';
  timestamp: string;
  total: string;
  trade_id: string;
}

export interface DepthOrder {
  price: string;
  quantity: string;
}

export interface OrderHistory {
  status: string;
  tx_id: string;
  type: string;
}

export interface OrderFill {
  order_id: string;
  price: string;
  quantity: string;
  timestamp: string;
}

export interface Order {
  cancel: boolean;
  close: boolean;
  fills: OrderFill[];
  history: OrderHistory[];
  market_id: string;
  order_id: string;
  owner: Identity;
  price: string;
  price_fill: string;
  quantity: string;
  quantity_fill: string;
  side: 'buy' | 'sell';
  timestamp: string;
}

export interface OrderBookBalance {
  fee: string;
  locked: string;
  unlocked: string;
}
