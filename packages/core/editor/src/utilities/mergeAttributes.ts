/**
 * Splits a CSS declaration list while preserving semicolons inside quotes and
 * function arguments.
 *
 * @param styles - CSS declaration list to split.
 * @returns Individual CSS declarations.
 */
function splitStyleDeclarations(styles: string): string[] {
  const declarations: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenthesisDepth = 0;

  for (const character of styles) {
    if (character === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += character;
      continue;
    }

    if (character === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += character;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (character === "(") {
        parenthesisDepth += 1;
        current += character;
        continue;
      }

      if (character === ")" && parenthesisDepth > 0) {
        parenthesisDepth -= 1;
        current += character;
        continue;
      }

      if (character === ";" && parenthesisDepth === 0) {
        declarations.push(current);
        current = "";
        continue;
      }
    }

    current += character;
  }

  if (current) {
    declarations.push(current);
  }

  return declarations;
}

/**
 * Parses CSS declarations into property/value tuples.
 *
 * @param styles - CSS declaration list to parse.
 * @returns CSS property/value tuples in declaration order.
 */
function parseStyleEntries(styles: unknown): [property: string, value: string][] {
  if (typeof styles !== "string") {
    return [];
  }

  const entries: [string, string][] = [];

  for (const declaration of splitStyleDeclarations(styles)) {
    const colonIndex = declaration.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }

    const property = declaration.slice(0, colonIndex).trim();
    const value = declaration.slice(colonIndex + 1).trim();

    if (property && value) {
      entries.push([property, value]);
    }
  }

  return entries;
}

/**
 * Merges HTML attributes the way extension render callbacks usually expect:
 * classes are deduplicated, styles are merged by CSS property, and later
 * non-special attributes replace earlier values.
 *
 * @param objects - Attribute objects to merge from left to right.
 * @returns Merged HTML attribute object.
 */
export function mergeAttributes(
  ...objects: readonly (Readonly<Record<string, unknown>> | null | undefined)[]
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};

  for (const object of objects) {
    if (!object) {
      continue;
    }

    for (const [key, value] of Object.entries(object)) {
      const existing = attributes[key];

      if (!existing) {
        attributes[key] = value;
        continue;
      }

      if (key === "class") {
        const existingClasses = String(existing).split(" ").filter(Boolean);
        const nextClasses = String(value).split(" ").filter(Boolean);
        const mergedClasses = [
          ...existingClasses,
          ...nextClasses.filter((className) => !existingClasses.includes(className))
        ];

        attributes[key] = mergedClasses.join(" ");
        continue;
      }

      if (key === "style") {
        const styleMap = new Map<string, string>([
          ...parseStyleEntries(existing),
          ...parseStyleEntries(value)
        ]);

        attributes[key] = Array.from(styleMap.entries())
          .map(([property, styleValue]) => `${property}: ${styleValue}`)
          .join("; ");
        continue;
      }

      attributes[key] = value;
    }
  }

  return attributes;
}
