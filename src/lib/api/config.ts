/**
 * Backend connection settings.
 *
 * The Django API is a separate, independently deployed service. The frontend
 * knows nothing about it except this base URL and the token it was issued.
 */

/** e.g. https://api.moneymalume.co.za — no trailing slash. */
export const API_BASE_URL: string = (
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "http://localhost:8000"
).replace(/\/+$/, "");

/** All endpoints live under this prefix on the Django side. */
export const API_PREFIX = "/api/v1";

export const TOKEN_STORAGE_KEY = "malume.auth.token";

/** True once a real backend URL has been configured. */
export const isBackendConfigured = (): boolean =>
  Boolean(import.meta.env['VITE_API_BASE_URL']);

/** Token is read lazily so this module stays safe to import during SSR. */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable — session simply won't persist */
  }
}
