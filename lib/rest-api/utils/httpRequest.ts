import globalAxios from 'axios';
import { isAxiosError, AxiosError, AxiosResponse, RawAxiosRequestConfig } from 'axios';
import type { ConfigurationRestAPI, RestApiResponse } from '../types';

/**
 * Converts a URL object to a full path string, including pathname, search parameters, and hash.
 *
 * @param url The URL object to convert to a path string.
 * @returns A complete path string representation of the URL.
 */
const toPathString = function (url: URL) {
  return url.pathname + url.search + url.hash;
};

/**
 * Delays execution for a specified number of milliseconds.
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Flag to prevent recursive error handler calls.
 * Set to true when inside an error handler to prevent infinite loops.
 */
let isInErrorHandler = false;

/**
 * Executes a request with retry logic that rebuilds the request on each attempt.
 * This is essential for requests that include nonce or session signatures, which
 * become stale if the error handler updates the nonce/session state.
 *
 * @param buildAndExecute - Function that builds and executes the request with fresh state
 * @param configuration - REST API configuration containing retry settings and error handler
 * @param onSuccess - Optional callback to run after successful execution
 * @returns The response from the successful request
 */
export const executeWithRetry = async function <T>(
  buildAndExecute: () => Promise<RestApiResponse<T>>,
  configuration: ConfigurationRestAPI,
  onSuccess?: () => void
): Promise<RestApiResponse<T>> {
  let lastError: any = new Error('Request failed after all retries.');

  for (let attempt = 0; attempt <= configuration.retries; attempt++) {
    try {
      const response = await buildAndExecute();
      onSuccess?.();
      return response;
    } catch (err) {
      configuration.logger.warn(`Request failed with error: ${(shortenAxiosError(err) as any).reason}`);

      lastError = err;
      const retriesLeft = configuration.retries - attempt;
      let shouldRetry = false;

      // Try custom error handler only if not already inside an error handler
      // This prevents recursive error handler calls during recovery operations
      if (configuration?.errorHandler && !isInErrorHandler) {
        isInErrorHandler = true;
        try {
          shouldRetry = await configuration.errorHandler(err);
        } finally {
          isInErrorHandler = false;
        }
      }

      // Retry if error handler indicates retry and we have retries left
      if (shouldRetry && retriesLeft > 0) {
        configuration.logger?.warn(`Retrying request (attempt ${attempt + 1}/${configuration.retries + 1})`);
        await delay(configuration.backoff * (attempt + 1));
        continue; // Rebuild and retry with fresh state
      }

      throw err;
    }
  }

  throw lastError;
};

/**
 * Generic function to send a request with optional API key and signature.
 * @param endpoint - The API endpoint to call.
 * @param method - HTTP method to use (GET, POST, DELETE, etc.).
 * @param params - Query parameters for the request.
 * @param options - Additional request options (ownerId).
 * @returns A promise resolving to the response data object.
 */
export const sendRequest = async function <T>(
  configuration: ConfigurationRestAPI,
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH',
  params: Record<string, unknown> = {},
  options: { ownerId?: string } = {}
): Promise<RestApiResponse<T>> {
  const localVarUrlObj = new URL(endpoint, configuration?.basePath);
  const localVarRequestOptions: RawAxiosRequestConfig = {
    method,
    ...configuration?.baseOptions,
  };

  if (method === 'GET' || method === 'DELETE') {
    localVarRequestOptions.params = params;
  } else {
    localVarRequestOptions.data = params;
  }

  // Add owner id if API call requires it
  if (options.ownerId) {
    localVarRequestOptions.headers = {
      ...localVarRequestOptions.headers,
      'O2-Owner-Id': options.ownerId,
    };
  }

  // Send HTTP request
  const url = (globalAxios.defaults?.baseURL ? '' : (configuration?.basePath ?? '')) + toPathString(localVarUrlObj);
  const response: AxiosResponse<string> = await globalAxios.request({
    ...localVarRequestOptions,
    url,
    responseType: 'text',
  });

  return {
    data: async (): Promise<T> => {
      try {
        return JSON.parse(response.data) as T;
      } catch (err) {
        throw new Error(`Failed to parse JSON response: ${err}. Response body: "${response.data}"`);
      }
    },
    status: response.status,
  };
};

export function shortenAxiosError(err: unknown) {
  if (!isAxiosError(err)) return err;

  const axiosError = err as AxiosError;
  const responseData = JSON.stringify(axiosError?.response?.data || '');
  return {
    status: axiosError.message,
    request: `${axiosError.config?.method?.toUpperCase()} ${axiosError.config?.url}`,
    body: axiosError.config?.data,
    reason: responseData,
  };
}
