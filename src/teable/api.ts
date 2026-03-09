import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import FormData from "form-data";
import qs from "qs";

const DEFAULT_BASE_URL = "https://app.teable.ai";
const BEARER_PREFIX = /^Bearer\s+/i;

export type TeableClientConfig = {
  baseUrl?: string;
  apiKey?: string;
  oauth?: {
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    tokenEndpoint?: string;
  };
};

export type TeableError = {
  status?: number;
  message: string;
  teableBody?: unknown;
  request?: { method: string; url: string };
};

export type OAuthExchangeCodeArgs = {
  clientId?: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
};

export type OAuthRefreshArgs = {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
};

export type OAuthRevokeArgs = {
  clientId: string;
  clientSecret?: string;
};

export type TeableClient = {
  get<T>(path: string, params?: unknown): Promise<T>;
  post<T>(path: string, body?: unknown, params?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown, params?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown, params?: unknown): Promise<T>;
  delete<T>(path: string, params?: unknown, body?: unknown): Promise<T>;
  postForm<T>(path: string, form: FormData): Promise<T>;
  oauthExchangeCode(args: OAuthExchangeCodeArgs): Promise<unknown>;
  oauthRefresh(args?: OAuthRefreshArgs): Promise<unknown>;
  oauthRevoke(args?: OAuthRevokeArgs): Promise<unknown>;
};

export class TeableApiError extends Error {
  readonly teableError: TeableError;

  constructor(teableError: TeableError) {
    super(teableError.message);
    this.name = "TeableApiError";
    this.teableError = teableError;
  }
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function normalizeBaseUrl(baseUrl?: string): string {
  const normalized = trimTrailingSlash(baseUrl || DEFAULT_BASE_URL);
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}

export function buildApiBaseUrl(baseUrl?: string): string {
  return `${normalizeBaseUrl(baseUrl)}/api`;
}

export function normalizeAuthToken(token?: string): string | undefined {
  if (!token) {
    return undefined;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(BEARER_PREFIX, "").trim() || undefined;
}

export function serializeTeableParams(params: unknown): string {
  return qs.stringify(params, {
    arrayFormat: "repeat",
    allowDots: true,
  });
}

const asErrorMessage = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "Teable request failed";
};

export function normalizeTeableError(
  error: unknown,
  fallbackRequest?: { method?: string; url?: string }
): TeableError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const responseBody = axiosError.response?.data;
    const messageFromBody =
      typeof responseBody === "object" && responseBody !== null
        ? ((responseBody as Record<string, unknown>).message ??
            (responseBody as Record<string, unknown>).error)
        : undefined;

    const requestMethod =
      axiosError.config?.method?.toUpperCase() ?? fallbackRequest?.method?.toUpperCase();
    const requestUrl = axiosError.config?.url ?? fallbackRequest?.url;

    return {
      status: axiosError.response?.status,
      message: asErrorMessage(messageFromBody ?? axiosError.message),
      teableBody: responseBody,
      request:
        requestMethod && requestUrl
          ? {
              method: requestMethod,
              url: requestUrl,
            }
          : undefined,
    };
  }

  if (error instanceof TeableApiError) {
    return error.teableError;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      request:
        fallbackRequest?.method && fallbackRequest?.url
          ? {
              method: fallbackRequest.method.toUpperCase(),
              url: fallbackRequest.url,
            }
          : undefined,
    };
  }

  return {
    message: "Unknown error from Teable client",
    request:
      fallbackRequest?.method && fallbackRequest?.url
        ? {
            method: fallbackRequest.method.toUpperCase(),
            url: fallbackRequest.url,
          }
        : undefined,
  };
}

const compactObject = <T extends Record<string, unknown>>(value: T): Partial<T> => {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null);
  return Object.fromEntries(entries) as Partial<T>;
};

type RequestConfig = AxiosRequestConfig & {
  _skipAuthRefresh?: boolean;
};

export function createTeableClient(config: TeableClientConfig): TeableClient {
  const baseApiUrl = buildApiBaseUrl(config.baseUrl);
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  const oauthState = {
    accessToken: normalizeAuthToken(config.oauth?.accessToken),
    refreshToken: normalizeAuthToken(config.oauth?.refreshToken),
    clientId: config.oauth?.clientId,
    clientSecret: config.oauth?.clientSecret,
    tokenEndpoint: config.oauth?.tokenEndpoint || `${baseUrl}/api/oauth/access_token`,
  };

  const client: AxiosInstance = axios.create({
    baseURL: baseApiUrl,
    headers: {
      Accept: "application/json",
    },
    paramsSerializer: {
      serialize: serializeTeableParams,
    },
  });

  const resolveBearerToken = () => oauthState.accessToken || normalizeAuthToken(config.apiKey);

  const maybeRefreshToken = async (): Promise<boolean> => {
    if (!oauthState.refreshToken || !oauthState.clientId || !oauthState.clientSecret) {
      return false;
    }

    try {
      const payload = qs.stringify(
        compactObject({
          grant_type: "refresh_token",
          client_id: oauthState.clientId,
          client_secret: oauthState.clientSecret,
          refresh_token: oauthState.refreshToken,
        })
      );

      const response = await axios.post(oauthState.tokenEndpoint, payload, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const responseBody = response.data as Record<string, unknown>;
      const nextAccessToken = responseBody.access_token;
      const nextRefreshToken = responseBody.refresh_token;

      if (typeof nextAccessToken === "string" && nextAccessToken) {
        oauthState.accessToken = nextAccessToken;
      }

      if (typeof nextRefreshToken === "string" && nextRefreshToken) {
        oauthState.refreshToken = nextRefreshToken;
      }

      return Boolean(oauthState.accessToken);
    } catch {
      return false;
    }
  };

  const request = async <T>(requestConfig: RequestConfig): Promise<T> => {
    const { _skipAuthRefresh, ...axiosRequestConfig } = requestConfig;

    try {
      const token = resolveBearerToken();
      const headers = {
        ...axiosRequestConfig.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await client.request<T>({
        ...axiosRequestConfig,
        headers,
      });
      return response.data;
    } catch (error) {
      const normalized = normalizeTeableError(error, {
        method: axiosRequestConfig.method,
        url: axiosRequestConfig.url,
      });

      if (!_skipAuthRefresh && normalized.status === 401 && oauthState.refreshToken) {
        const refreshed = await maybeRefreshToken();
        if (refreshed) {
          return request<T>({ ...requestConfig, _skipAuthRefresh: true });
        }
      }

      throw new TeableApiError(normalized);
    }
  };

  const oauthExchangeCode = async (args: OAuthExchangeCodeArgs): Promise<unknown> => {
    const payload = qs.stringify(
      compactObject({
        grant_type: "authorization_code",
        client_id: args.clientId || oauthState.clientId,
        client_secret: args.clientSecret || oauthState.clientSecret,
        code: args.code,
        redirect_uri: args.redirectUri,
      })
    );

    const response = await axios.post(oauthState.tokenEndpoint, payload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data;
  };

  const oauthRefresh = async (args?: OAuthRefreshArgs): Promise<unknown> => {
    const payload = qs.stringify(
      compactObject({
        grant_type: "refresh_token",
        client_id: args?.clientId || oauthState.clientId,
        client_secret: args?.clientSecret || oauthState.clientSecret,
        refresh_token: args?.refreshToken || oauthState.refreshToken,
      })
    );

    const response = await axios.post(oauthState.tokenEndpoint, payload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseBody = response.data as Record<string, unknown>;

    if (typeof responseBody.access_token === "string" && responseBody.access_token) {
      oauthState.accessToken = responseBody.access_token;
    }

    if (typeof responseBody.refresh_token === "string" && responseBody.refresh_token) {
      oauthState.refreshToken = responseBody.refresh_token;
    }

    return responseBody;
  };

  const oauthRevoke = async (args?: OAuthRevokeArgs): Promise<unknown> => {
    const clientId = args?.clientId || oauthState.clientId;
    if (!clientId) {
      throw new TeableApiError({
        message: "Missing OAuth clientId for token revoke.",
        request: {
          method: "POST",
          url: "/oauth/client/{clientId}/revoke-token",
        },
      });
    }

    const payload = compactObject({
      clientSecret: args?.clientSecret || oauthState.clientSecret,
    });
    return request<unknown>({
      method: "POST",
      url: `/oauth/client/${clientId}/revoke-token`,
      data: payload,
      _skipAuthRefresh: true,
    });
  };

  return {
    get: <T>(path: string, params?: unknown) =>
      request<T>({
        method: "GET",
        url: path,
        params,
      }),
    post: <T>(path: string, body?: unknown, params?: unknown) =>
      request<T>({
        method: "POST",
        url: path,
        data: body,
        params,
      }),
    put: <T>(path: string, body?: unknown, params?: unknown) =>
      request<T>({
        method: "PUT",
        url: path,
        data: body,
        params,
      }),
    patch: <T>(path: string, body?: unknown, params?: unknown) =>
      request<T>({
        method: "PATCH",
        url: path,
        data: body,
        params,
      }),
    delete: <T>(path: string, params?: unknown, body?: unknown) =>
      request<T>({
        method: "DELETE",
        url: path,
        params,
        data: body,
      }),
    postForm: <T>(path: string, form: FormData) =>
      request<T>({
        method: "POST",
        url: path,
        data: form,
        headers: form.getHeaders(),
      }),
    oauthExchangeCode,
    oauthRefresh,
    oauthRevoke,
  };
}
