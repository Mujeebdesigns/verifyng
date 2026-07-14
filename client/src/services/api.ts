import { API_BASE_URL, API_PREFIX } from '../utils/config.js';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function handleResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    let errorMessage = `HTTP error! Status: ${response.status}`;
    try {
      const errorData = (await response.json()) as { error?: string };
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Ignore parse failure, use fallback message
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json() as unknown;
  } catch {
    return null;
  }
}

export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const headers = new Headers(options.headers);
  const { body, ...restOptions } = options;

  let fetchBody: BodyInit | null | undefined = undefined;

  // Default to JSON body if payload is provided
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      fetchBody = body;
    } else {
      headers.set('Content-Type', 'application/json');
      fetchBody = JSON.stringify(body);
    }
  }

  const url = `${API_BASE_URL}${API_PREFIX}${path}`;
  const response = await fetch(url, {
    ...restOptions,
    headers,
    body: fetchBody,
    credentials: 'include',
  });

  return handleResponse(response);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request(path, { ...options, method: 'GET' }) as Promise<T>,

  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request(path, { ...options, method: 'POST', body }) as Promise<T>,

  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request(path, { ...options, method: 'PUT', body }) as Promise<T>,

  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request(path, { ...options, method: 'DELETE' }) as Promise<T>,
};
