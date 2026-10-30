/** Small fetch wrapper for client components talking to our JSON API. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    credentials: "same-origin",
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiClientError(
      typeof data.error === "string" ? data.error : res.statusText,
      res.status,
      typeof data.code === "string" ? data.code : undefined,
      data.details
    );
  }
  return data as T;
}

/** Maps a validation error's details to { fieldPath: message }. */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiClientError) || !Array.isArray(err.details)) return {};
  const out: Record<string, string> = {};
  for (const d of err.details as { path?: string; message?: string }[]) {
    if (d.path && d.message && !out[d.path]) out[d.path] = d.message;
  }
  return out;
}

/** Splits a comma/newline separated string into a trimmed list. */
export function splitList(value: string): string[] {
  return value
    .split(/[,\n،]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
