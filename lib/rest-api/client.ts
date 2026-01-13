import { B256Address, Address } from 'fuels';

import { AccountApi } from './endpoints/account-api';
import { SessionApi } from './endpoints/session-api';
import { MarketApi } from './endpoints/market-api';
import { BarsApi } from './endpoints/bars-api';
import { HealthApi } from './endpoints/health-api';
import { BalanceApi } from './endpoints/balance-api';
import { TradesApi } from './endpoints/trades-api';
import { DepthApi } from './endpoints/depth-api';
import { OrdersApi } from './endpoints/orders-api';
import { OrderApi } from './endpoints/order-api';
import { TradeAccountManager } from './trade-account';

import { sendRequest, executeWithRetry } from './utils/httpRequest';
import { encodeActions } from './utils/o2-encoders';

import { OrderBook } from '../types/contracts/OrderBook';
import type { SessionInput } from '../types/contracts/TradeAccount';

import {
  ConfigurationRestAPI,
  RestApiResponse,
  TradeAccountManagerConfig,
  CreateTradingAccountRequest,
  CreateTradingAccountResponse,
  CreateSessionRequest,
  MarketsResponse,
  GetTickerRequest,
  GetTickerResponse,
  GetSummaryRequest,
  GetSummaryResponse,
  GetBarsRequest,
  GetBarsResponse,
  GetBalanceRequest,
  GetBalanceResponse,
  GetTradesRequest,
  GetTradesResponse,
  GetTradesByAccountRequest,
  GetTradesByAccountResponse,
  GetDepthRequest,
  GetDepthResponse,
  GetOrdersRequest,
  GetOrdersResponse,
  GetOrderRequest,
  GetOrderResponse,
  SessionSubmitTransactionResponse,
  SessionActionBatch,
  MarketId,
} from './types';

export class RestAPI {
  private configuration: ConfigurationRestAPI;

  // Handle signing and nonces
  private tradeAccountManager!: TradeAccountManager;

  // Api Calls
  private accountApi: AccountApi;
  private sessionApi: SessionApi;
  private marketApi: MarketApi;
  private barsApi: BarsApi;
  private healthApi: HealthApi;
  private balanceApi: BalanceApi;
  private tradesApi: TradesApi;
  private depthApi: DepthApi;
  private ordersApi: OrdersApi;
  private orderApi: OrderApi;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = new ConfigurationRestAPI(configuration);

    // API
    this.accountApi = new AccountApi(this.configuration);
    this.sessionApi = new SessionApi(this.configuration);
    this.marketApi = new MarketApi(this.configuration);
    this.barsApi = new BarsApi(this.configuration);
    this.healthApi = new HealthApi(this.configuration);
    this.balanceApi = new BalanceApi(this.configuration);
    this.tradesApi = new TradesApi(this.configuration);
    this.depthApi = new DepthApi(this.configuration);
    this.ordersApi = new OrdersApi(this.configuration);
    this.orderApi = new OrderApi(this.configuration);
  }

  /**
   * Initializes trade account manager by setting up trade account contract, fetching nonce, and creating a 30-day session.
   * @param tradeAccountManager - Trade account manager configuration.
   * @param errorHandler - Optional custom error handler factory. Receives tradeAccountManager and restApi, returns error handler function. If not provided, uses default handler for nonce and session errors.
   */
  public async initTradeAccountManager(
    tradeAccountManagerConfig: TradeAccountManagerConfig,
    errorHandler?: (tradeAccountManager: TradeAccountManager, restApi: RestAPI) => (error: any) => Promise<boolean>
  ) {
    // Create TradeAccountId if not passed
    if (!tradeAccountManagerConfig.tradeAccountId) {
      const responseTradeAccount = await this.createTradingAccount({
        address: tradeAccountManagerConfig.account.address.toString(),
      });
      tradeAccountManagerConfig.tradeAccountId = (await responseTradeAccount.data()).trade_account_id;
      if (!tradeAccountManagerConfig.contractIds) {
        tradeAccountManagerConfig.contractIds = [];
      }
      tradeAccountManagerConfig.contractIds.push(tradeAccountManagerConfig.tradeAccountId);
    }

    this.tradeAccountManager = new TradeAccountManager(tradeAccountManagerConfig);
    // Setup error handler for automatic recovery
    if (errorHandler) {
      this.configuration.errorHandler = errorHandler(this.tradeAccountManager, this);
    } else {
      this.configuration.errorHandler = createDefaultErrorHandler(this.tradeAccountManager, this);
    }

    await this.tradeAccountManager.fetchNonce();
    await this.tradeAccountManager.recoverSession();

    const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    if (!tradeAccountManagerConfig.contractIds) {
      throw new Error('contractIds must be defined');
    }
    await this.createSession({ contractIds: tradeAccountManagerConfig.contractIds, expiry });
  }

  /**
   * Generic function to send a request.
   * @param endpoint - The API endpoint to call.
   * @param method - HTTP method to use (GET, POST, DELETE, etc.).
   * @param params - Query parameters for the request.
   * @returns A promise resolving to the response data object.
   */
  sendRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH',
    params: Record<string, unknown> = {}
  ): Promise<RestApiResponse<T>> {
    return sendRequest<T>(this.configuration, endpoint, method, params);
  }

  public getTradeAccountId(): Address {
    return this.tradeAccountManager.contractId;
  }

  /**
   * Initializes a trade account contract, all balance for trading need to be in this account.
   * @param requestParameters - The user wallet address.
   */
  public async createTradingAccount(
    requestParameters: CreateTradingAccountRequest
  ): Promise<RestApiResponse<CreateTradingAccountResponse>> {
    return executeWithRetry(async () => this.accountApi.createTradingAccount(requestParameters), this.configuration);
  }

  /**
   * Initializes a new session if not already initialized. Retreive the session otherwise
   * @param requestParameters - The orderbooks the trading account is allowed to trade in.
   */
  public async createSession(requestParameters: CreateSessionRequest): Promise<RestApiResponse<SessionInput>> {
    return executeWithRetry(
      async () => {
        // Build params with fresh nonce
        const params = await this.tradeAccountManager.api_CreateSessionParams(
          requestParameters.contractIds,
          requestParameters.expiry
        );

        const session = await this.accountApi.createSession(params, this.tradeAccountManager.ownerAddress.toString());
        this.tradeAccountManager.setSession(await session.data());
        return session;
      },
      this.configuration,
      () => this.tradeAccountManager.incrementNonce()
    );
  }

  /**
   * Submit an array of actions as a transaction. If any actions fail, the transaction fails completely.
   * Maximum of 5 actions per transaction. A settle balance is automatically included if there is
   * a create order.
   * @param requestParameters - The actions on the orderbook.
   */
  public async sessionSubmitTransaction(
    requestParameters: SessionActionBatch
  ): Promise<RestApiResponse<SessionSubmitTransactionResponse>> {
    return executeWithRetry(
      async () => {
        // Convert actions to contract calls
        const encodedActions = await encodeActions(
          this.tradeAccountManager.identity,
          new OrderBook(requestParameters.market.contract_id, this.tradeAccountManager.account),
          {
            baseAssetId: requestParameters.market.base.asset as B256Address,
            quoteAssetId: requestParameters.market.quote.asset as B256Address,
            baseDecimals: requestParameters.market.base.decimals,
            quoteDecimals: requestParameters.market.quote.decimals,
          },
          requestParameters.actions,
          this.tradeAccountManager.defaultGasLimit
        );

        // Convert to API readable with fresh nonce and session
        const payload = await this.tradeAccountManager.api_SessionCallContractsParams(encodedActions.invokeScopes);

        return this.sessionApi.sessionSubmitTransaction(
          {
            actions: [
              {
                market_id: requestParameters.market.market_id as MarketId,
                actions: encodedActions.actions,
              },
            ],
            signature: payload.signature,
            nonce: payload.nonce,
            trade_account_id: payload.trade_account_id,
            session_id: payload.session_id,
            variable_outputs: payload.variable_outputs,
            min_gas_limit: payload.min_gas_limit,
            collect_orders: true,
          },
          this.tradeAccountManager.ownerAddress.toString()
        );
      },
      this.configuration,
      () => this.tradeAccountManager.incrementNonce()
    );
  }

  /**
   * Retreives all markets.
   */
  public async getMarkets(): Promise<RestApiResponse<MarketsResponse>> {
    return executeWithRetry(async () => this.marketApi.getMarkets(), this.configuration);
  }

  /**
   * Retrieves ticker information for a specific market.
   * @param requestParameters - The market ID to get ticker for.
   */
  public async getTicker(requestParameters: GetTickerRequest): Promise<RestApiResponse<GetTickerResponse>> {
    return executeWithRetry(async () => this.marketApi.getTicker(requestParameters), this.configuration);
  }

  /**
   * Retrieves summary information for a specific market.
   * @param requestParameters - The market ID to get summary for.
   */
  public async getSummary(requestParameters: GetSummaryRequest): Promise<RestApiResponse<GetSummaryResponse>> {
    return executeWithRetry(async () => this.marketApi.getSummary(requestParameters), this.configuration);
  }

  /**
   * Retreives the market candles. Can specify either retreive the latest x candles or a time range.
   * @param requestParameters - The range of the candles.
   */
  public async getBars(requestParameters: GetBarsRequest): Promise<RestApiResponse<GetBarsResponse>> {
    return executeWithRetry(async () => this.barsApi.getBars(requestParameters), this.configuration);
  }

  /**
   * Health check.
   */
  public async getHealth(): Promise<RestApiResponse<string>> {
    return executeWithRetry(async () => this.healthApi.getHealth(), this.configuration);
  }

  /**
   * Retrieves balance information for a specific asset and contract.
   * @param requestParameters - The asset ID and contract address.
   */
  public async getBalance(requestParameters: GetBalanceRequest): Promise<RestApiResponse<GetBalanceResponse>> {
    return executeWithRetry(async () => {
      if (requestParameters.contract === undefined) {
        requestParameters.contract = this.tradeAccountManager.contractId.toString();
      }
      return this.balanceApi.getBalance(requestParameters);
    }, this.configuration);
  }

  /**
   * Retrieves recent trades for a specific market.
   * @param requestParameters - The market ID, direction, and count of trades to retrieve.
   */
  public async getTrades(requestParameters: GetTradesRequest): Promise<RestApiResponse<GetTradesResponse>> {
    return executeWithRetry(async () => this.tradesApi.getTrades(requestParameters), this.configuration);
  }

  /**
   * Retrieves trades by account for a specific market and contract.
   * @param requestParameters - The market ID, contract address, direction, and count of trades to retrieve.
   */
  public async getTradesByAccount(
    requestParameters: GetTradesByAccountRequest
  ): Promise<RestApiResponse<GetTradesByAccountResponse>> {
    return executeWithRetry(async () => {
      if (requestParameters.contract === undefined) {
        requestParameters.contract = this.tradeAccountManager.contractId.toString();
      }
      return this.tradesApi.getTradesByAccount(requestParameters);
    }, this.configuration);
  }

  /**
   * Retrieves order book depth for a specific market.
   * @param requestParameters - The market ID and precision for depth aggregation.
   */
  public async getDepth(requestParameters: GetDepthRequest): Promise<RestApiResponse<GetDepthResponse>> {
    return executeWithRetry(async () => this.depthApi.getDepth(requestParameters), this.configuration);
  }

  /**
   * Retrieves orders for a specific market and contract.
   * @param requestParameters - The market ID, filters for orders and optional contract address.
   */
  public async getOrders(requestParameters: GetOrdersRequest): Promise<RestApiResponse<GetOrdersResponse>> {
    return executeWithRetry(async () => {
      if (requestParameters.contract === undefined) {
        requestParameters.contract = this.tradeAccountManager.contractId.toString();
      }
      return this.ordersApi.getOrders(requestParameters);
    }, this.configuration);
  }

  /**
   * Retrieves a single order by ID and market.
   * @param requestParameters - The order ID and market ID.
   */
  public async getOrder(requestParameters: GetOrderRequest): Promise<RestApiResponse<GetOrderResponse>> {
    return executeWithRetry(async () => this.orderApi.getOrder(requestParameters), this.configuration);
  }
}

/**
 * Default error handler for automatic recovery of nonce and session errors.
 * @param tradeAccountManager - Trade account manager instance.
 * @param restApi - RestAPI instance for creating new sessions.
 * @returns Error handler function that returns true if error was handled and should retry.
 */
export function createDefaultErrorHandler(
  tradeAccountManager: TradeAccountManager,
  restApi: RestAPI
): (error: any) => Promise<boolean> {
  return async (error: any) => {
    const errorMessage = JSON.stringify(error?.response?.data || '');

    // Fetch nonce from on-chain and retry the request
    if (
      errorMessage.includes('Nonce in the request') &&
      errorMessage.includes('is less than the nonce in the database')
    ) {
      await tradeAccountManager.fetchNonce();
      return true;
    }

    // Handle invalid sessions
    if (
      errorMessage.includes('Invalid session address') ||
      errorMessage.includes('11023126350627756633') // Temporary: specific error code for invalid session
    ) {
      await tradeAccountManager.fetchNonce();
      await tradeAccountManager.recoverSession();
      const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

      await restApi.createSession({
        contractIds: tradeAccountManager.contractIds as string[],
        expiry,
      });
      return true;
    }

    return false;
  };
}
