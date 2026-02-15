import { createLogger } from "./logger";

const logger = createLogger("API");

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

  try {
    const response = await fetch(endpoint, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "API request failed",
      }));

      const errorMessage = errorData.error || `API Error: ${response.status}`;
      logger.error(`Request to ${endpoint} failed: ${errorMessage}`, {
        status: response.status,
        statusText: response.statusText
      });

      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (!(error instanceof Error)) {
      logger.error(`Unexpected error during fetch to ${endpoint}`, error);
    }
    throw error;
  }
}
