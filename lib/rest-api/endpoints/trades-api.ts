import type {
  ConfigurationRestAPI,
  RestApiResponse,
  GetTradesRequest,
  GetTradesResponse,
  GetTradesByAccountRequest,
  GetTradesByAccountResponse,
} from '../types';
import { sendRequest } from '../utils/httpRequest';

export class TradesApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getTrades(requestParameters: GetTradesRequest): Promise<RestApiResponse<GetTradesResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetTradesRequest]));
      }
    }

    // Construct the full endpoint path with the query string.
    const endpointWithParams = `/v1/trades?${params.toString()}`;
    return await sendRequest<GetTradesResponse>(this.configuration, endpointWithParams, 'GET', {});
  }

  public async getTradesByAccount(
    requestParameters: GetTradesByAccountRequest
  ): Promise<RestApiResponse<GetTradesByAccountResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetTradesByAccountRequest]));
      }
    }

    // Construct the full endpoint path with the query string.
    const endpointWithParams = `/v1/trades_by_account?${params.toString()}`;
    return await sendRequest<GetTradesByAccountResponse>(this.configuration, endpointWithParams, 'GET', {});
  }
}
