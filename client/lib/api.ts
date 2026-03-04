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

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (text.trim().startsWith("<!DOCTYPE")) {
      throw new Error("API configuration error: Request redirected to SPA frontend.");
    }
    throw new Error(`Server returned unexpected format: ${contentType || "unknown"}`);
  }

  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }

  return data;
}
