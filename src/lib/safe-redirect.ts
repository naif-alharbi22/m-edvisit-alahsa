/** Only allow same-origin relative paths as post-login redirects (blocks open redirects). */
export function safeCallbackUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("://")) return null;
  return value;
}
