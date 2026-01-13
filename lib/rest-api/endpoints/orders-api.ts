import type { ConfigurationRestAPI, RestApiResponse, GetOrdersRequest, GetOrdersResponse } from '../types';
import { sendRequest } from '../utils/httpRequest';

export class OrdersApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getOrders(requestParameters: GetOrdersRequest): Promise<RestApiResponse<GetOrdersResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetOrdersRequest]));
      }
    }

    // Construct the full endpoint path with the query string.
    const endpointWithParams = `/v1/orders?${params.toString()}`;
    return await sendRequest<GetOrdersResponse>(this.configuration, endpointWithParams, 'GET', {});
  }
}
