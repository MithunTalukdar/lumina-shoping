import { User } from "../types";
import { buildApiUrl } from "./apiBase";

const AUTH_TOKEN_STORAGE_KEY = "lumina_auth_token";
const POST_AUTH_REDIRECT_STORAGE_KEY = "lumina_post_auth_redirect";

export type GoogleAuthMode = "login" | "register";

interface AuthResponse {
  token: string;
  user: User;
}

interface MeResponse {
  user: User;
}

interface PasswordRecoveryResponse {
  message: string;
  cooldownSeconds?: number;
  expiresInMinutes?: number;
}

interface VerifyOtpResponse {
  message: string;
  resetToken: string;
}

export interface GoogleAuthRedirectResult {
  type: "success" | "error";
  mode: GoogleAuthMode;
  message?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || "Request failed.";
    throw new Error(message);
  }

  return data as T;
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function sanitizeInternalPath(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith("/") || trimmedValue.startsWith("//")) {
    return null;
  }

  return trimmedValue;
}

function normalizeGoogleAuthMode(value: string | null | undefined): GoogleAuthMode {
  return value === "register" ? "register" : "login";
}

export function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function setPostAuthRedirectPath(path: string) {
  const safePath = sanitizeInternalPath(path);
  if (!safePath) {
    return;
  }

  sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, safePath);
}

export function getPostAuthRedirectPath() {
  return sanitizeInternalPath(sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY));
}

export function clearPostAuthRedirectPath() {
  sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
}

export function consumePostAuthRedirectPath() {
  const redirectPath = getPostAuthRedirectPath();
  clearPostAuthRedirectPath();
  return redirectPath;
}

export function startGoogleAuth(mode: GoogleAuthMode = "login", returnTo?: string) {
  const currentPath = sanitizeInternalPath(window.location.pathname);
  const safeReturnTo =
    sanitizeInternalPath(returnTo) ??
    (currentPath === "/login" ? getPostAuthRedirectPath() : currentPath) ??
    "/shop";

  const query = new URLSearchParams({
    mode,
    origin: window.location.origin,
    returnTo: safeReturnTo,
  });

  window.location.assign(buildApiUrl(`/api/auth/google/authorize?${query.toString()}`));
}

export function consumeGoogleAuthRedirect(): GoogleAuthRedirectResult | null {
  const hashValue = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hashValue) {
    return null;
  }

  const hashParams = new URLSearchParams(hashValue);
  const authToken = hashParams.get("authToken")?.trim() ?? "";
  const authError = hashParams.get("authError")?.trim() ?? "";

  if (!authToken && !authError) {
    return null;
  }

  const returnTo = sanitizeInternalPath(hashParams.get("returnTo")) ?? consumePostAuthRedirectPath() ?? "/shop";
  const mode = normalizeGoogleAuthMode(hashParams.get("authMode"));

  clearPostAuthRedirectPath();
  window.history.replaceState(null, "", returnTo);

  if (authToken) {
    setAuthToken(authToken);
    return {
      type: "success",
      mode,
    };
  }

  setAuthToken(null);
  return {
    type: "error",
    mode,
    message: authError || "Unable to continue with Google right now.",
  };
}

export async function login(email: string, password: string): Promise<User> {
  const response = await request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setAuthToken(response.token);
  return response.user;
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const response = await request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  setAuthToken(response.token);
  return response.user;
}

export async function requestPasswordResetOtp(email: string): Promise<PasswordRecoveryResponse> {
  return request<PasswordRecoveryResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
  return request<VerifyOtpResponse>("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPasswordWithOtp(resetToken: string, newPassword: string, confirmPassword: string): Promise<PasswordRecoveryResponse> {
  return request<PasswordRecoveryResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
}

export async function logout(): Promise<void> {
  try {
    await request<{ message: string }>("/api/auth/logout", {
      method: "POST",
      headers: authHeaders(),
    });
  } finally {
    setAuthToken(null);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  try {
    const response = await request<MeResponse>("/api/auth/me", {
      method: "GET",
      headers: authHeaders(),
    });

    return response.user;
  } catch (error) {
    setAuthToken(null);
    return null;
  }
}
