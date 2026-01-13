import WebSocket from 'ws';
import {
  WsClientOptions,
  WsEventMap,
  WsEventType,
  SubscribeBalancesParams,
  SubscribeTradesParams,
  SubscribeOrdersParams,
  SubscribeDepthParams,
  SubscribeDepthViewParams,
  Logger,
} from './types';

type Listener<T> = (data: T) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnect: boolean;
  private reconnectDelay: number;
  private listeners = new Map<WsEventType, Set<Listener<any>>>();
  private closed = false;
  private logger: Logger;

  constructor(options: WsClientOptions) {
    this.url = options.url;
    this.reconnect = options.reconnect ?? true;
    this.reconnectDelay = options.reconnectDelay ?? 5000;
    this.logger = options.logger ?? console;
  }

  connect(): this {
    this.closed = false;
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => this.logger.log('[WS] Connected'));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (err: Error) => this.emit('error', err));
    this.ws.on('message', (data: WebSocket.Data) => this.handleMessage(data.toString()));

    return this;
  }

  disconnect(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }

  // ------- Subscriptions -------

  subscribeBalances(params: SubscribeBalancesParams): this {
    this.send({ action: 'subscribe_balances', ...params });
    return this;
  }

  subscribeTrades(params: SubscribeTradesParams): this {
    this.send({ action: 'subscribe_trades', ...params });
    return this;
  }

  subscribeOrders(params: SubscribeOrdersParams): this {
    this.send({ action: 'subscribe_orders', ...params });
    return this;
  }

  subscribeDepth(params: SubscribeDepthParams): this {
    this.send({ action: 'subscribe_depth', ...params });
    return this;
  }

  subscribeDepthView(params: SubscribeDepthViewParams): this {
    this.send({ action: 'subscribe_depth_view', ...params });
    return this;
  }

  // ------- Event Handlers -------

  on<K extends WsEventType>(event: K, listener: Listener<WsEventMap[K]>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  off<K extends WsEventType>(event: K, listener: Listener<WsEventMap[K]>): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  // ------- Internals -------

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private emit<K extends WsEventType>(event: K, data: WsEventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);
      // Route based on action field
      if (msg.action && this.listeners.has(msg.action)) {
        this.emit(msg.action, msg);
      }
    } catch (err) {
      this.emit('error', err as Error);
    }
  }

  private handleClose(): void {
    this.logger.log('[WS] Disconnected');
    if (this.reconnect && !this.closed) {
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }
}
