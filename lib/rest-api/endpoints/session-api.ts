import type {
  ConfigurationRestAPI,
  RestApiResponse,
  SessionSubmitTransactionRequest,
  SessionSubmitTransactionResponse,
} from '../types';
import { sendRequest } from '../utils/httpRequest';

export class SessionApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async sessionSubmitTransaction(
    requestParameters: SessionSubmitTransactionRequest,
    ownerId: string
  ): Promise<RestApiResponse<SessionSubmitTransactionResponse>> {
    const response = await sendRequest<SessionSubmitTransactionResponse>(
      this.configuration,
      '/v1/session/actions',
      'POST',
      { ...requestParameters },
      { ownerId: ownerId }
    );
    return response;
  }
}
