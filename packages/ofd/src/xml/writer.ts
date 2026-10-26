import type {
  OFDXmlAttributeValue,
  OFDXmlElement,
  OFDXmlNode
} from "./types";

/**
 * Creates an immutable XML element.
 *
 * @param name - Qualified element name.
 * @param attributes - Attributes in deterministic insertion order.
 * @param children - Ordered child elements and escaped text.
 * @returns XML element description.
 */
export function ofdXmlElement(
  name: string,
  attributes: Readonly<Record<string, OFDXmlAttributeValue>> = {},
  children: readonly OFDXmlNode[] = []
): OFDXmlElement {
  return { name, attributes, children };
}

/**
 * Serializes one complete UTF-8 XML document.
 *
 * @param root - Root element.
 * @returns XML declaration and deterministic element content.
 */
export function renderOFDXmlDocument(root: OFDXmlElement): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderElement(root, 0)}\n`;
}

/**
 * Renders one element recursively.
 *
 * @param element - Element to render.
 * @param depth - Current indentation depth.
 * @returns Serialized element.
 */
function renderElement(element: OFDXmlElement, depth: number): string {
  const indentation = "  ".repeat(depth);
  const attributes = Object.entries(element.attributes)
    .filter((entry): entry is [
      string,
      Exclude<OFDXmlAttributeValue, undefined>
    ] => entry[1] !== undefined)
    .map(([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`)
    .join("");
  if (element.children.length === 0) {
    return `${indentation}<${element.name}${attributes}/>`;
  }
  if (element.children.every((child) => typeof child === "string")) {
    const text = element.children.map((child) => escapeText(String(child))).join("");
    return `${indentation}<${element.name}${attributes}>${text}</${element.name}>`;
  }
  const children = element.children
    .map((child) => typeof child === "string"
      ? `${"  ".repeat(depth + 1)}${escapeText(child)}`
      : renderElement(child, depth + 1))
    .join("\n");
  return `${indentation}<${element.name}${attributes}>\n${children}\n`
    + `${indentation}</${element.name}>`;
}

/**
 * Escapes XML character data.
 *
 * @param value - Untrusted character data.
 * @returns Escaped XML text.
 */
function escapeText(value: string): string {
  return encodeInvalidXmlCharacters(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Escapes an XML attribute.
 *
 * @param value - Untrusted attribute value.
 * @returns Escaped attribute text.
 */
function escapeAttribute(value: string): string {
  return escapeText(value)
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Encodes XML 1.0-disallowed code points with OFD hexadecimal escapes.
 *
 * @param value - Untrusted XML character data.
 * @returns XML-safe OFD character data.
 */
function encodeInvalidXmlCharacters(value: string): string {
  let encoded = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    const allowed = codePoint === 0x09
      || codePoint === 0x0a
      || codePoint === 0x0d
      || (codePoint >= 0x20 && codePoint <= 0xd7ff)
      || (codePoint >= 0xe000 && codePoint <= 0xfffd)
      || (codePoint >= 0x10000 && codePoint <= 0x10ffff);
    encoded += allowed
      ? character
      : `\\${codePoint.toString(16).padStart(4, "0")}`;
  }
  return encoded;
}
