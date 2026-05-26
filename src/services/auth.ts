import { apiRequest, setAuthSession } from "../lib/api";

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  httpCode?: number;
  httpMessage?: string;
  message?: string;
  data?: {
    id?: string;
    accessToken?: string;
    refreshToken?: string | null;
    access_token?: string;
    refresh_token?: string | null;
    role?: string;
  };
  error?: string | null;
};

export type VerifyOtpPayload = {
  userId: string;
  otp: string;
};

export type VerifyOtpResponse = {
  httpCode?: number;
  httpMessage?: string;
  message?: string;
  data?: {
    accessToken?: string;
    refreshToken?: string | null;
    access_token?: string;
    refresh_token?: string | null;
    role?: string;
  };
  error?: string | null;
};

export type ResendOtpPayload = {
  userId: string;
};

export type ResendOtpResponse = {
  httpCode?: number;
  httpMessage?: string;
  message?: string;
  data?: unknown;
  error?: string | null;
};

export type ForgotPasswordPayload = {
  email: string;
};

function extractAccessToken(response: VerifyOtpResponse | LoginResponse) {
  return response.data?.accessToken ?? response.data?.access_token ?? "";
}

function extractRefreshToken(response: VerifyOtpResponse | LoginResponse) {
  return response.data?.refreshToken ?? response.data?.refresh_token ?? null;
}

function extractRole(response: VerifyOtpResponse | LoginResponse) {
  return response.data?.role ?? "";
}

function extractUserId(response: LoginResponse) {
  return response.data?.id ?? "";
}

export async function login(payload: LoginPayload, signal?: AbortSignal) {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: {
      email: payload.identifier.trim(),
      password: payload.password,
    },
    auth: false,
    signal,
  });

  const accessToken = extractAccessToken(response);
  const refreshToken = extractRefreshToken(response);

  if (accessToken) {
    setAuthSession({
      accessToken,
      refreshToken,
    });
  }

  return {
    ...response,
    userId: extractUserId(response),
    accessToken,
    refreshToken,
    role: extractRole(response),
  };
}

export async function verifyOtp(
  payload: VerifyOtpPayload,
  signal?: AbortSignal,
) {
  const response = await apiRequest<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: {
      user_id: payload.userId,
      otp: payload.otp,
    },
    auth: false,
    signal,
  });

  const accessToken = extractAccessToken(response);
  const refreshToken = extractRefreshToken(response);

  if (accessToken) {
    setAuthSession({
      accessToken,
      refreshToken,
    });
  }

  return {
    ...response,
    accessToken,
    refreshToken,
    role: extractRole(response),
  };
}

export function resendOtp(payload: ResendOtpPayload, signal?: AbortSignal) {
  return apiRequest<ResendOtpResponse>("/auth/resend-otp", {
    method: "POST",
    body: {
      user_id: payload.userId,
    },
    auth: false,
    signal,
  });
}

export function forgotPassword(
  payload: ForgotPasswordPayload,
  signal?: AbortSignal,
) {
  return apiRequest<{
    httpCode?: number;
    httpMessage?: string;
    message?: string;
    data?: unknown;
    error?: string | null;
  }>("/auth/forgot-password", {
    method: "POST",
    body: payload,
    auth: false,
    signal,
  });
}
