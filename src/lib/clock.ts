/**
 * Request-time clock for server components. Server components render once per
 * request, so reading the time there is safe; keeping it behind a function also
 * makes it easy to stub in tests.
 */
export function requestTime(): number {
  return Date.now();
}
