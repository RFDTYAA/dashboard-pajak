const FALLBACK_API_BASE_URL = "https://api.anooa.id/tms";

const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || FALLBACK_API_BASE_URL;

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

const ACCESS_TOKEN_STORAGE_KEY = "auth_pajak_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "auth_pajak_refresh_token";
export const USER_ROLE_STORAGE_KEY = "auth_pajak_role";

type Primitive = string | number | boolean | null | undefined;

type QueryValue = Primitive | Primitive[];

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
  retryOnUnauthorized?: boolean;
};

type DownloadOptions = Omit<RequestOptions, "body"> & {
  body?: BodyInit | null;
};

type AuthSession = {
  accessToken: string;
  refreshToken?: string | null;
};

type ApiErrorShape = {
  message?: string;
  error?: string;
  httpMessage?: string;
  data?: unknown;
};

type RefreshTokenResponse = {
  data?: {
    access_token?: string;
    refresh_token?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
};

function appendQueryParams(url: URL, query?: Record<string, QueryValue>) {
  if (!query) return;

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === "") return;
        url.searchParams.append(key, String(item));
      });
      return;
    }

    url.searchParams.set(key, String(value));
  });
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);
  appendQueryParams(url, query);
  return url;
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function getUserRole() {
  return localStorage.getItem(USER_ROLE_STORAGE_KEY);
}

export function setUserRole(role: string) {
  localStorage.setItem(USER_ROLE_STORAGE_KEY, role);
}

export function setAuthSession(session: AuthSession) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);

  if (session.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_ROLE_STORAGE_KEY);

  localStorage.removeItem("auth_pajak");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_role");
  localStorage.removeItem("tms_access_token");
  localStorage.removeItem("tms_refresh_token");
  localStorage.removeItem("tms_user_role");
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}

function tryParseJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as ApiErrorShape;
  return (
    candidate.error || candidate.message || candidate.httpMessage || fallback
  );
}

function isUnauthorizedOrExpired(message: string, status: number) {
  const lowerMessage = message.toLowerCase();

  return (
    status === 401 ||
    lowerMessage.includes("jwt expired") ||
    lowerMessage.includes("token expired") ||
    lowerMessage.includes("unauthorized")
  );
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
      refreshToken,
    }),
  });

  const rawText = await response.text();
  const parsed = rawText ? tryParseJson(rawText) : null;

  if (!response.ok || !parsed || typeof parsed !== "object") {
    return null;
  }

  const payload = parsed as RefreshTokenResponse;

  const accessToken =
    payload.data?.access_token ??
    payload.data?.accessToken ??
    payload.access_token ??
    payload.accessToken ??
    null;

  const newRefreshToken =
    payload.data?.refresh_token ??
    payload.data?.refreshToken ??
    payload.refresh_token ??
    payload.refreshToken ??
    refreshToken;

  if (!accessToken) return null;

  setAuthSession({
    accessToken,
    refreshToken: newRefreshToken,
  });

  return accessToken;
}

async function requestOnce(
  url: URL,
  options: RequestOptions,
  tokenOverride?: string | null,
): Promise<{
  ok: boolean;
  status: number;
  parsed: unknown;
  errorMessage: string;
}> {
  const { method = "GET", body, headers, auth = true, signal } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = tokenOverride ?? getAccessToken();
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    signal,
  });

  const rawText = await response.text();
  const parsed = rawText ? tryParseJson(rawText) : null;
  const errorMessage = getErrorMessage(
    parsed,
    `Request gagal dengan status ${response.status}`,
  );

  return {
    ok: response.ok,
    status: response.status,
    parsed,
    errorMessage,
  };
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { query, auth = true, retryOnUnauthorized = true } = options;
  const url = buildUrl(path, query);

  const firstResult = await requestOnce(url, options);

  if (firstResult.ok) {
    return (firstResult.parsed ?? ({} as T)) as T;
  }

  const shouldRefresh =
    auth &&
    retryOnUnauthorized &&
    isUnauthorizedOrExpired(firstResult.errorMessage, firstResult.status);

  if (shouldRefresh) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      const retryResult = await requestOnce(url, options, newAccessToken);

      if (retryResult.ok) {
        return (retryResult.parsed ?? ({} as T)) as T;
      }

      if (
        isUnauthorizedOrExpired(retryResult.errorMessage, retryResult.status)
      ) {
        clearAuthSession();
        window.location.replace("/login");
      }

      throw new Error(retryResult.errorMessage);
    }

    clearAuthSession();
    window.location.replace("/login");
  }

  throw new Error(firstResult.errorMessage);
}

export async function apiDownload(
  path: string,
  options: DownloadOptions = {},
): Promise<Blob> {
  const { query, auth = true, retryOnUnauthorized = true } = options;
  const url = buildUrl(path, query);

  const makeDownloadRequest = async (tokenOverride?: string | null) => {
    const { method = "GET", body, headers, signal } = options;

    const finalHeaders: Record<string, string> = {
      ...headers,
    };

    if (auth) {
      const token = tokenOverride ?? getAccessToken();
      if (token) {
        finalHeaders.Authorization = `Bearer ${token}`;
      }
    }

    return fetch(url.toString(), {
      method,
      headers: finalHeaders,
      body,
      signal,
    });
  };

  let response = await makeDownloadRequest();

  if (
    !response.ok &&
    auth &&
    retryOnUnauthorized &&
    isUnauthorizedOrExpired(
      getErrorMessage(
        tryParseJson(await response.clone().text()),
        `Download gagal dengan status ${response.status}`,
      ),
      response.status,
    )
  ) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      response = await makeDownloadRequest(newAccessToken);
    } else {
      clearAuthSession();
      window.location.replace("/login");
    }
  }

  if (!response.ok) {
    const rawText = await response.text();
    const parsed = rawText ? tryParseJson(rawText) : null;
    const errorMessage = getErrorMessage(
      parsed,
      `Download gagal dengan status ${response.status}`,
    );

    if (isUnauthorizedOrExpired(errorMessage, response.status)) {
      clearAuthSession();
      window.location.replace("/login");
    }

    throw new Error(errorMessage);
  }

  return response.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
