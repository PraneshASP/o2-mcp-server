import type {
  ConfigurationRestAPI,
  RestApiResponse,
  MarketsResponse,
  GetTickerRequest,
  GetTickerResponse,
  GetSummaryRequest,
  GetSummaryResponse,
} from '../types';
import { sendRequest } from '../utils/httpRequest';

export class MarketApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getMarkets(): Promise<RestApiResponse<MarketsResponse>> {
    return await sendRequest<MarketsResponse>(this.configuration, '/v1/markets', 'GET', {});
  }

  public async getTicker(requestParameters: GetTickerRequest): Promise<RestApiResponse<GetTickerResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetTickerRequest]));
      }
    }

    // Construct the full endpoint path with the query string.
    const endpointWithParams = `/v1/markets/ticker?${params.toString()}`;
    return await sendRequest<GetTickerResponse>(this.configuration, endpointWithParams, 'GET', {});
  }

  public async getSummary(requestParameters: GetSummaryRequest): Promise<RestApiResponse<GetSummaryResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetSummaryRequest]));
      }
    }

    // Construct the full endpoint path with the query string.
    const endpointWithParams = `/v1/markets/summary?${params.toString()}`;
    return await sendRequest<GetSummaryResponse>(this.configuration, endpointWithParams, 'GET', {});
  }
}
