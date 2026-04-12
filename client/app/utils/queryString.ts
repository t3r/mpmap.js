/**
 * Read a single query-string parameter. Mirrors legacy behaviour:
 * - `?flag` (no `=`) yields `true`
 * - missing key yields `defaultValue`
 */
export function getQueryParam(name: string, defaultValue: string | number | boolean): string | number | boolean {
  const query = window.location.search.startsWith('?')
    ? window.location.search.slice(1)
    : window.location.search
  const pairs = decodeURIComponent(query).split('&')
  for (const pair of pairs) {
    if (!pair) continue
    const [rawKey, rawVal] = pair.split('=')
    if (rawKey !== name) continue
    if (rawVal === undefined) return true
    return rawVal
  }
  return defaultValue
}
