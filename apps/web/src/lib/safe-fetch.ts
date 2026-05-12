export class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'FetchError'
    this.status = status
  }
}

/**
 * Wrapper around fetch that throws FetchError on non-OK responses.
 * React Query will catch the thrown error and expose it via isError/error.
 */
export async function safeFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Request failed (${res.status})` }))
    throw new FetchError(body.error ?? `Request failed (${res.status})`, res.status)
  }

  return res.json() as Promise<T>
}
