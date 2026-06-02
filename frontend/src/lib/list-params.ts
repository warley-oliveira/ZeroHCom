// Drops empty/undefined entries before sending list filters as query params,
// so the URL and the request stay clean (no ?status=&page=). Axios serializes
// the returned object into the query string. Accepts any params object (the
// typed *ListParams interfaces) and keeps only present string/number values.
export function cleanParams<T extends object>(params: T): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    if (typeof value === "string" || typeof value === "number") out[key] = value
  }
  return out
}
