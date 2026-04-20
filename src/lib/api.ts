export type QueryValue = string | number | boolean | null | undefined;

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  auth?: boolean;
};

const FALLBACK_API_BASE_URL = "https://api.anooa.id/tms";
const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || FALLBACK_API_BASE_URL;

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");
export const AUTH_FLAG_STORAGE_KEY = "auth_pajak";
export const ACCESS_TOKEN_STORAGE_KEY = "auth_pajak_token";
export const REFRESH_TOKEN_STORAGE_KEY = "auth_pajak_refresh_token";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length ? text : null;
}

function buildErrorMessage(data: unknown, status: number) {
  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length) {
      return message;
    }
  }

  return `Request gagal dengan status ${status}`;
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function isAuthenticated() {
  return (
    localStorage.getItem(AUTH_FLAG_STORAGE_KEY) === "true" ||
    Boolean(getAccessToken())
  );
}

export function setAuthSession(payload: {
  accessToken: string;
  refreshToken?: string | null;
}) {
  localStorage.setItem(AUTH_FLAG_STORAGE_KEY, "true");
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, payload.accessToken);

  if (payload.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, payload.refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_FLAG_STORAGE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    signal: options.signal,
    body: hasBody
      ? isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body)
      : undefined,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      buildErrorMessage(data, response.status),
      response.status,
      data,
    );
  }

  return data as T;
}

function extractFileName(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? null;
}

export async function apiDownload(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ blob: Blob; fileName: string | null }> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    signal: options.signal,
    body: hasBody
      ? isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body)
      : undefined,
  });

  if (!response.ok) {
    const data = await parseResponse(response);
    throw new ApiError(
      buildErrorMessage(data, response.status),
      response.status,
      data,
    );
  }

  return {
    blob: await response.blob(),
    fileName: extractFileName(response.headers.get("content-disposition")),
  };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
