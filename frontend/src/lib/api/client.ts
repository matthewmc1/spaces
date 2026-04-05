const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

let tokenGetter: (() => Promise<string | null>) | null = null;

// setTokenGetter registers a function that returns the current auth token.
// Called once by ClerkTokenBridge on app mount.
export function setTokenGetter(fn: () => Promise<string | null>) {
  tokenGetter = fn;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = tokenGetter ? await tokenGetter() : null;
  const authValue = token ?? "dev-token";
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authValue}`,
      ...options.headers,
    },
    mode: "cors",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code || "unknown",
      body?.error?.message || res.statusText
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
