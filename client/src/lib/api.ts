/**
 * Thin wrapper around fetch for communicating with the Express API.
 * Automatically attaches the JWT from localStorage and throws on non-2xx responses.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  // Attach JWT if present (runs only on the client)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorBody.message ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                          => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, data: unknown)           => request<T>(path, { method: 'POST', data }),
  patch:  <T>(path: string, data: unknown)           => request<T>(path, { method: 'PATCH', data }),
  delete: <T>(path: string)                          => request<T>(path, { method: 'DELETE' }),
};
