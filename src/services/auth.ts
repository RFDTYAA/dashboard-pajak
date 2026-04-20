import { apiRequest, setAuthSession } from "../lib/api";

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  requiresOtp?: boolean;
  sessionToken?: string;
  accessToken?: string;
  refreshToken?: string | null;
  message?: string;
};

export type VerifyOtpPayload = {
  identifier: string;
  otp: string;
  sessionToken?: string;
};

export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken?: string | null;
  message?: string;
};

export type ResendOtpPayload = {
  identifier: string;
  sessionToken?: string;
};

export type ResendOtpResponse = {
  sessionToken?: string;
  message?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export async function login(payload: LoginPayload, signal?: AbortSignal) {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
    signal,
  });

  if (response.accessToken) {
    setAuthSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken ?? null,
    });
  }

  return response;
}

export async function verifyOtp(
  payload: VerifyOtpPayload,
  signal?: AbortSignal,
) {
  const response = await apiRequest<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: payload,
    auth: false,
    signal,
  });

  setAuthSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken ?? null,
  });

  return response;
}

export function resendOtp(payload: ResendOtpPayload, signal?: AbortSignal) {
  return apiRequest<ResendOtpResponse>("/auth/resend-otp", {
    method: "POST",
    body: payload,
    auth: false,
    signal,
  });
}

export function forgotPassword(
  payload: ForgotPasswordPayload,
  signal?: AbortSignal,
) {
  return apiRequest<{ message?: string }>("/auth/forgot-password", {
    method: "POST",
    body: payload,
    auth: false,
    signal,
  });
}
