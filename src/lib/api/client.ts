import { API_BASE_URL, API_PREFIX, getAuthToken, setAuthToken } from "./config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** field -> messages, as DRF returns on 400 */
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** multipart upload — body must be FormData */
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  let detail = `Request failed with status ${response.status}`;
  let fieldErrors: Record<string, string[]> = {};
  try {
    const body = (await response.json()) as Record<string, unknown>;
    if (typeof body['detail'] === "string") detail = body['detail'];
    const entries = Object.entries(body).filter(([k]) => k !== "detail");
    if (entries.length) {
      fieldErrors = Object.fromEntries(
        entries.map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : [String(v)]]),
      );
      if (detail.startsWith("Request failed")) {
        detail = Object.values(fieldErrors)[0]?.[0] ?? detail;
      }
    }
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(response.status, detail, fieldErrors);
}

/**
 * Single entry point for every call to the Django API.
 * Attaches the auth token, normalises errors, and clears a dead session on 401.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, query, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Token ${token}`;
  if (body !== undefined && !formData) headers['Content-Type'] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      ...(formData ? { body: formData } : body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (cause) {
    throw new ApiError(0, "Couldn't reach the backend. Check that the API is running and reachable.", {});
  }

  if (response.status === 401) {
    setAuthToken(null);
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
