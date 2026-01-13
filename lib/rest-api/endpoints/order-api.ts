import type { ConfigurationRestAPI, RestApiResponse, GetOrderRequest, GetOrderResponse } from '../types';
import { sendRequest } from '../utils/httpRequest';

export class OrderApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getOrder(requestParameters: GetOrderRequest): Promise<RestApiResponse<GetOrderResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetOrderRequest]));
      }
    }

    // Construct the full endpoint path with the query string.
    const endpointWithParams = `/v1/order?${params.toString()}`;
    return await sendRequest<GetOrderResponse>(this.configuration, endpointWithParams, 'GET', {});
  }
}
