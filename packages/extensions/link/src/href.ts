/** Default maximum target length admitted by the Link Mark. */
export const defaultLinkHrefMaximumLength = 2048;

/** Default maximum visible text length admitted by collapsed Link insertion. */
export const defaultLinkDisplayTextMaximumLength = 4096;

const defaultAllowedLinkProtocols = Object.freeze([
  "http",
  "https",
  "mailto",
  "tel"
]);
const explicitSchemePattern = /^([A-Za-z][A-Za-z0-9+.-]*):/u;
const unsafeLinkCharacterPattern = /[\u0000-\u0020\u007f-\u009f\s]/u;
const unsafeLinkDisplayTextPattern =
  /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;

/**
 * Normalizes and validates one candidate hyperlink target.
 *
 * @param value - Candidate target from commands or serialization.
 * @returns Trimmed safe target, or null when rejected.
 */
export function normalizeLinkHref(
  value: unknown
): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (
    href.length === 0
    || href.length > defaultLinkHrefMaximumLength
    || unsafeLinkCharacterPattern.test(href)
  ) {
    return null;
  }

  const scheme = explicitSchemePattern.exec(href)?.[1]?.toLowerCase();
  if (
    scheme !== undefined
    && !defaultAllowedLinkProtocols.some(
      (protocol) => protocol.toLowerCase() === scheme
    )
  ) {
    return null;
  }
  return href;
}

/**
 * Reports whether a candidate target follows the default Link policy.
 *
 * @param value - Candidate hyperlink target.
 * @returns Whether the target is safe and canonicalizable.
 */
export function isAllowedLinkHref(value: unknown): value is string {
  return normalizeLinkHref(value) !== null;
}

/**
 * Resolves safe visible text for collapsed Link insertion.
 *
 * Empty or whitespace-only optional input uses the normalized target fallback.
 * Non-empty text is preserved exactly so intentional surrounding spaces are
 * ordinary document content instead of being rewritten by product UI.
 *
 * @param value - Optional display text supplied by a command or product form.
 * @param fallbackHref - Already normalized target used when text is empty.
 * @returns Safe visible text, or null when the input is invalid.
 */
export function normalizeLinkDisplayText(
  value: unknown,
  fallbackHref: string
): string | null {
  if (
    value === undefined
    || (typeof value === "string" && value.trim() === "")
  ) {
    return fallbackHref;
  }
  if (
    typeof value !== "string"
    || value.length > defaultLinkDisplayTextMaximumLength
    || unsafeLinkDisplayTextPattern.test(value)
  ) {
    return null;
  }
  return value;
}
