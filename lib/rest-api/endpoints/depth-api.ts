import type { ConfigurationRestAPI, RestApiResponse, GetDepthRequest, GetDepthResponse } from '../types';
import { sendRequest } from '../utils/httpRequest';

export class DepthApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getDepth(requestParameters: GetDepthRequest): Promise<RestApiResponse<GetDepthResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetDepthRequest]));
      }
    }

    const endpointWithParams = `/v1/depth?${params.toString()}`;
    return await sendRequest<GetDepthResponse>(this.configuration, endpointWithParams, 'GET', {});
  }
}
