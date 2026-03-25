import { User } from "../types";
import { buildApiUrl } from "./apiBase";

const AUTH_TOKEN_STORAGE_KEY = "lumina_auth_token";

interface AuthResponse {
  token: string;
  user: User;
}

interface MeResponse {
  user: User;
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

export function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
