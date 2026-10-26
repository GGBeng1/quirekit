/**
 * Parses shortcode attributes where every value is quoted.
 *
 * @param attrString - Shortcode attribute source.
 * @returns Parsed shortcode attributes.
 */
export function parseShortcodeAttributes(attrString: string): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  for (const match of attrString.matchAll(/(\w+)=(?:"([^"]*)"|'([^']*)')/g)) {
    const key = match[1];
    const doubleQuoted = match[2];
    const singleQuoted = match[3];

    if (!key) {
      continue;
    }

    attributes[key] = doubleQuoted ?? singleQuoted ?? "";
  }

  return attributes;
}

/**
 * Serializes shortcode attributes with double-quoted values.
 *
 * @param attrs - Attributes to serialize.
 * @returns Shortcode attribute string.
 */
export function serializeShortcodeAttributes(
  attrs: Readonly<Record<string, unknown>>
): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(" ");
}

/**
 * Escapes a name for safe use inside a generated regular expression.
 *
 * @param value - Literal value to escape.
 * @returns Escaped regular expression source.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Filters attributes with an allow list.
 *
 * @param attrs - Source attributes.
 * @param allowedAttributes - Names that should be kept.
 * @returns Filtered attributes.
 */
export function filterAllowedAttributes(
  attrs: Readonly<Record<string, unknown>>,
  allowedAttributes?: readonly string[] | undefined
): Record<string, unknown> {
  if (!allowedAttributes) {
    return { ...attrs };
  }

  const filtered: Record<string, unknown> = {};

  for (const key of allowedAttributes) {
    if (Object.prototype.hasOwnProperty.call(attrs, key)) {
      filtered[key] = attrs[key];
    }
  }

  return filtered;
}
