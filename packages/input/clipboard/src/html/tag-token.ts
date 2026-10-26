/** Parsed fallback HTML tag token. */
export interface QuireClipboardHtmlTagToken {
  /** Lowercase local tag name. */
  readonly name: string;
  /** Whether the token represents a closing tag. */
  readonly closing: boolean;
}

/**
 * Parses a simple HTML tag token.
 *
 * @param token - Raw token beginning with "<".
 * @returns Parsed tag information, or null for malformed tokens.
 */
export function parseHtmlTagToken(token: string): QuireClipboardHtmlTagToken | null {
  const match = /^<\s*(\/)?\s*([a-zA-Z][\w:-]*)\b[^>]*>$/.exec(token);

  if (!match) {
    return null;
  }

  const rawName = match[2];

  if (!rawName) {
    return null;
  }

  const normalizedName = rawName.toLowerCase();

  return {
    name: normalizedName.split(":").pop() ?? normalizedName,
    closing: match[1] === "/"
  };
}
