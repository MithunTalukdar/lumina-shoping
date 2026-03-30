const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function buildApiUrl(path: string) {
  return configuredApiBaseUrl ? `${configuredApiBaseUrl}${path}` : path;
}

export function getApiOrigin() {
  const baseUrl = configuredApiBaseUrl || window.location.origin;

  try {
    return new URL(baseUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}
