/**
 * @param value - Untrusted stored address.
 * @returns The address when it is `http(s)` or site-relative; script and data schemes are rejected.
 */
export function previewAddress(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 2048 || /[\s\\"'<>`]/u.test(value)) throw new TypeError("preview: invalid address");
  if (/^\/(?!\/)/u.test(value)) return value;
  if (/^https?:\/\/[^/?#]+/iu.test(value)) return value;
  throw new TypeError("preview: address must be http(s) or site-relative");
}
