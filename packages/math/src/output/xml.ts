/**
 * Escapes text for an XML text node or quoted attribute.
 * @param value - Untrusted author text.
 * @returns XML-safe text.
 */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}
