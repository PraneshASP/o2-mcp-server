import type {
  ConfigurationRestAPI,
  RestApiResponse,
  CreateTradingAccountRequest,
  CreateTradingAccountResponse,
  API_CreateSessionRequest,
} from '../types';
import type { SessionInput } from '../../types/contracts/TradeAccount';
import { sendRequest } from '../utils/httpRequest';

export class AccountApi {
  private readonly configuration: ConfigurationRestAPI;

  constructor(configuration: ConfigurationRestAPI) {
    this.configuration = configuration;
  }

  public async createTradingAccount(
    requestParameters: CreateTradingAccountRequest
  ): Promise<RestApiResponse<CreateTradingAccountResponse>> {
    const localVarBodyParameter: Record<string, unknown> = {};

    if (requestParameters.address !== undefined && requestParameters.address !== null) {
      localVarBodyParameter['identity'] = {
        Address: requestParameters.address,
      };
    }
    return await sendRequest<CreateTradingAccountResponse>(
      this.configuration,
      '/v1/accounts',
      'POST',
      localVarBodyParameter
    );
  }

  public async createSession(
    requestParameters: API_CreateSessionRequest,
    ownerId: string
  ): Promise<RestApiResponse<SessionInput>> {
    return await sendRequest<SessionInput>(
      this.configuration,
      '/v1/session',
      'PUT',
      { ...requestParameters },
      { ownerId: ownerId }
    );
  }
}
