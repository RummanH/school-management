export function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function apiRequest(path, options = {}) {
  const { body, headers, ...rest } = options;
  const response = await fetch(`/api${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
    ...rest,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}
