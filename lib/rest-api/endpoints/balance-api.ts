import type { ConfigurationRestAPI, RestApiResponse, GetBalanceRequest, GetBalanceResponse } from '../types';
import { sendRequest } from '../utils/httpRequest';

export class BalanceApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getBalance(requestParameters: GetBalanceRequest): Promise<RestApiResponse<GetBalanceResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetBalanceRequest]));
      }
    }

    const endpointWithParams = `/v1/balance?${params.toString()}`;
    return await sendRequest<GetBalanceResponse>(this.configuration, endpointWithParams, 'GET', {});
  }
}
