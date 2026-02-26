/**
 * Wrapper around native fetch that injects X-User-Id header
 * from localStorage auth state. Drop-in replacement for fetch().
 */
export function fetchApi(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  try {
    const raw = localStorage.getItem("auth");
    if (raw) {
      const auth = JSON.parse(raw);
      if (auth?.user?.id) {
        headers.set("X-User-Id", String(auth.user.id));
      }
    }
  } catch {
    // ignore
  }

  return fetch(input, { ...init, headers });
}
