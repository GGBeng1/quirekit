const dangerousHtmlTagPattern =
  /<\s*(script|style|iframe|object|embed|link|meta|title|head)\b[^>]*>[\s\S]*?<\s*\/\1\s*>/gi;
const dangerousSelfClosingHtmlTagPattern =
  /<\s*(script|style|iframe|object|embed|link|meta|title|head)\b[^>]*\/?\s*>/gi;

// Executable URL schemes that must not survive on href/src. data:image/* stays
// allowed because pasted images depend on it; only data:text/html is blocked.
const dangerousUrlScheme = "(?:javascript|vbscript):|data:text\\/html";
const dangerousUrlAttributePattern = new RegExp(
  `\\s+(href|src)\\s*=\\s*(?:"\\s*(?:${dangerousUrlScheme})[^"]*"` +
    `|'\\s*(?:${dangerousUrlScheme})[^']*'` +
    `|(?:${dangerousUrlScheme})[^\\s>]+)`,
  "gi"
);

/**
 * Removes active-content HTML that must never enter canvas clipboard parsing.
 *
 * @param html - Raw clipboard HTML.
 * @returns Sanitized HTML containing passive semantic markup only.
 */
export function sanitizeQuireClipboardHtml(html: string): string {
  return html
    .replace(dangerousHtmlTagPattern, "")
    .replace(dangerousSelfClosingHtmlTagPattern, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(dangerousUrlAttributePattern, "");
}
