import type { ConfigurationRestAPI, RestApiResponse } from '../types';
import { sendRequest } from '../utils/httpRequest';

export class HealthApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async getHealth(): Promise<RestApiResponse<string>> {
    return await sendRequest<string>(this.configuration, '/health', 'GET', {});
  }
}
