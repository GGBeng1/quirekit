/**
 * Parses Pandoc-style Markdown attributes.
 *
 * @param attrString - Attribute source such as `.note #id checked key="value"`.
 * @returns Attribute object keyed by attribute name.
 */
export function parseAttributes(attrString: string): Record<string, unknown> {
  if (!attrString.trim()) {
    return {};
  }

  const attributes: Record<string, unknown> = {};
  const quoted: string[] = [];
  const protectedSource = attrString.replace(/["']([^"']*)["']/g, (match) => {
    quoted.push(match);
    return `__QUIRE_QUOTED_${quoted.length - 1}__`;
  });

  const classMatches = protectedSource.match(/(?:^|\s)\.([a-zA-Z][\w-]*)/g);
  if (classMatches) {
    attributes.class = classMatches
      .map((match) => match.trim().slice(1))
      .join(" ");
  }

  const idMatch = protectedSource.match(/(?:^|\s)#([a-zA-Z][\w-]*)/);
  if (idMatch) {
    attributes.id = idMatch[1];
  }

  for (const match of protectedSource.matchAll(
    /([a-zA-Z][\w-]*)\s*=\s*(__QUIRE_QUOTED_\d+__)/g
  )) {
    const key = match[1];
    const quotedRef = match[2];

    if (!key || !quotedRef) {
      continue;
    }

    const quotedIndex = Number.parseInt(
      quotedRef.match(/__QUIRE_QUOTED_(\d+)__/)?.[1] ?? "0",
      10
    );
    const value = quoted[quotedIndex];

    if (value) {
      attributes[key] = value.slice(1, -1);
    }
  }

  const remaining = protectedSource
    .replace(/(?:^|\s)\.([a-zA-Z][\w-]*)/g, "")
    .replace(/(?:^|\s)#([a-zA-Z][\w-]*)/g, "")
    .replace(/([a-zA-Z][\w-]*)\s*=\s*__QUIRE_QUOTED_\d+__/g, "")
    .trim();

  for (const attribute of remaining.split(/\s+/).filter(Boolean)) {
    if (/^[a-zA-Z][\w-]*$/.test(attribute)) {
      attributes[attribute] = true;
    }
  }

  return attributes;
}

/**
 * Serializes attributes into Pandoc-style Markdown syntax.
 *
 * @param attributes - Attributes to serialize.
 * @returns Serialized attribute string.
 */
export function serializeAttributes(
  attributes: Readonly<Record<string, unknown>>
): string {
  const parts: string[] = [];

  if (attributes.class) {
    parts.push(
      ...String(attributes.class)
        .split(/\s+/)
        .filter(Boolean)
        .map((className) => `.${className}`)
    );
  }

  if (attributes.id) {
    parts.push(`#${String(attributes.id)}`);
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (key === "class" || key === "id") {
      continue;
    }

    if (value === true) {
      parts.push(key);
      continue;
    }

    if (value !== false && value !== null && value !== undefined) {
      parts.push(`${key}="${String(value)}"`);
    }
  }

  return parts.join(" ");
}
