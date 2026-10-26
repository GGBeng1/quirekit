/** @param value - Authored URL. @returns Normalized web URL, excluding credentials and executable schemes. */
export function webURL(value: unknown): string | null {
  if (typeof value !== "string" || /[\u0000-\u0020]/u.test(value.trim())) return null;
  try { const url = new URL(value.trim()); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
/** @param value - Persisted source. @param mime - Resource MIME. @returns Whether the portable source is usable in its declared role. */
export function resourceURL(value: unknown, mime = ""): boolean {
  if (webURL(value)) return true;
  if (typeof value !== "string") return false;
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/]*={0,2})$/u.exec(value);
  return !!match && !!match[2] && (!mime || match[1] === mime);
}
