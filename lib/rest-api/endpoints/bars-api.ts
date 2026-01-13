import type { ConfigurationRestAPI, RestApiResponse, GetBarsRequest, GetBarsResponse } from '../types';
import { sendRequest } from '../utils/httpRequest';

export class BarsApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getBars(requestParameters: GetBarsRequest): Promise<RestApiResponse<GetBarsResponse>> {
    const params = new URLSearchParams();
    for (const key in requestParameters) {
      if (Object.prototype.hasOwnProperty.call(requestParameters, key)) {
        params.append(key, String(requestParameters[key as keyof GetBarsRequest]));
      }
    }

    // For CountBack, "from" should be same as "to"
    if ('count_back' in requestParameters) {
      params.append('from', String(requestParameters.to));
    }

    // Construct the full endpoint path with the query string.
    const endpointWithParams = `/v1/bars?${params.toString()}`;
    return await sendRequest<GetBarsResponse>(this.configuration, endpointWithParams, 'GET', {});
  }
}
