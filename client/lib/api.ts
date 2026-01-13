export async function apiFetch(
  endpoint: string,
  options: RequestInit & { token?: string } = {},
) {
  const { token, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && fetchOptions.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "API request failed",
    }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}
