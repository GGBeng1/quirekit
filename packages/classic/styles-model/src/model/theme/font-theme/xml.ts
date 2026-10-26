import type {
  OoxmlXmlElement,
  OoxmlXmlElementFrame
} from "./types";

/** Tokens sufficient for the small OOXML font-theme projection. */
const xmlTokenPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/[\s\S]*?>|<[^>]+>/gu;

/** Attributes accepted from namespace-qualified OOXML start tags. */
const xmlAttributePattern = /([\w.-]+(?::[\w.-]+)?)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu;

/**
 * Scans XML start tags without requiring a browser DOM implementation.
 *
 * The scanner intentionally exposes only namespace-local names and decoded
 * attributes. Unknown elements remain harmless while ancestry keeps the
 * `docDefaults`, style, and theme-role scopes unambiguous.
 *
 * @param xml - OOXML part text.
 * @returns Start tags in source order with open ancestor frames.
 */
export function scanOoxmlXmlElements(xml: string): readonly OoxmlXmlElement[] {
  const elements: OoxmlXmlElement[] = [];
  const stack: OoxmlXmlElementFrame[] = [];
  for (const match of xml.matchAll(xmlTokenPattern)) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<?") || token.startsWith("<!")) {
      continue;
    }
    if (token.startsWith("</")) {
      closeElement(stack, readLocalName(token.slice(2)));
      continue;
    }
    const nameMatch = /^<\s*([^\s/>]+)/u.exec(token);
    if (nameMatch?.[1] === undefined) {
      continue;
    }
    const element: OoxmlXmlElement = {
      localName: readLocalName(nameMatch[1]),
      attributes: readAttributes(token),
      ancestors: stack.map((frame) => ({ ...frame }))
    };
    elements.push(element);
    if (!/\/\s*>$/u.test(token)) {
      stack.push({
        localName: element.localName,
        attributes: element.attributes
      });
    }
  }
  return elements;
}

/**
 * Closes the most recent matching element frame.
 *
 * @param stack - Mutable open-element stack.
 * @param localName - Namespace-local closing tag name.
 */
function closeElement(stack: OoxmlXmlElementFrame[], localName: string): void {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index]?.localName === localName) {
      stack.splice(index);
      return;
    }
  }
}

/**
 * Reads namespace-local attributes from one start tag.
 *
 * @param token - XML start-tag token.
 * @returns Decoded attributes keyed by namespace-local name.
 */
function readAttributes(token: string): Readonly<Record<string, string>> {
  const attributes: Record<string, string> = {};
  for (const match of token.matchAll(xmlAttributePattern)) {
    const name = match[1];
    if (name !== undefined) {
      attributes[readLocalName(name)] = decodeXmlEntities(match[2] ?? match[3] ?? "");
    }
  }
  return attributes;
}

/**
 * Removes an XML namespace prefix and trailing token syntax.
 *
 * @param name - Qualified element or attribute name.
 * @returns Namespace-local name.
 */
function readLocalName(name: string): string {
  return name.trim().replace(/[\s/>].*$/u, "").split(":").at(-1) ?? "";
}

/**
 * Decodes the XML entities permitted in OOXML attribute values.
 *
 * @param value - Encoded attribute value.
 * @returns Decoded string.
 */
function decodeXmlEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos);/giu,
    (entity, decimal: string | undefined, hexadecimal: string | undefined) => {
      if (decimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      }
      if (hexadecimal !== undefined) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      }
      return ({
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": "\"",
        "&apos;": "'"
      } as Readonly<Record<string, string>>)[entity.toLowerCase()] ?? entity;
    }
  );
}
