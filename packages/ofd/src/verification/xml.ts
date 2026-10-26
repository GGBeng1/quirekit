import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { OFDPackageVerificationIssue } from "./types";

/** Parsed XML entry retained while verifying its package graph. */
export interface OFDPackageXmlEntry {
  /** Normalized archive entry path. */
  readonly path: string;
  /** Parsed XML root object. */
  readonly value: Record<string, unknown>;
}

const xmlParser = new XMLParser({
  attributeNamePrefix: "@_",
  htmlEntities: false,
  ignoreAttributes: false,
  maxNestedTags: 128,
  parseTagValue: false,
  processEntities: {
    enabled: true,
    maxEntityCount: 16,
    maxEntitySize: 1_024,
    maxExpandedLength: 16_384,
    maxTotalExpansions: 32
  },
  removeNSPrefix: true,
  strictReservedNames: true,
  trimValues: false
});

/**
 * Parses every XML archive entry independently.
 *
 * @param entries - Unpacked package entries keyed by normalized path.
 * @param decoder - UTF-8 decoder shared by the verifier.
 * @param issues - Mutable issue sink.
 * @returns Successfully parsed XML entries keyed by package path.
 */
export function parseOFDPackageXmlEntries(
  entries: ReadonlyMap<string, Uint8Array>,
  decoder: TextDecoder,
  issues: OFDPackageVerificationIssue[]
): ReadonlyMap<string, OFDPackageXmlEntry> {
  const parsed = new Map<string, OFDPackageXmlEntry>();
  for (const [path, bytes] of entries) {
    if (!path.endsWith(".xml")) continue;
    const source = decoder.decode(bytes);
    const structuralValidation = XMLValidator.validate(source);
    if (structuralValidation !== true) {
      issues.push({
        code: "xml-invalid",
        message: `XML entry "${path}" is not well formed.`,
        entryPath: path
      });
      continue;
    }
    try {
      const value = xmlParser.parse(source);
      if (!isRecord(value)) {
        issues.push({
          code: "xml-invalid",
          message: `XML entry "${path}" does not contain an element root.`,
          entryPath: path
        });
        continue;
      }
      parsed.set(path, { path, value });
    } catch {
      issues.push({
        code: "xml-invalid",
        message: `XML entry "${path}" could not be parsed.`,
        entryPath: path
      });
    }
  }
  return parsed;
}

/**
 * Reads one named root element from a parsed XML entry.
 *
 * @param entry - Parsed XML entry.
 * @param name - Expected namespace-normalized element name.
 * @param issues - Mutable issue sink.
 * @returns Root element object, or undefined when it is absent or malformed.
 */
export function requireOFDPackageXmlRoot(
  entry: OFDPackageXmlEntry,
  name: string,
  issues: OFDPackageVerificationIssue[]
): Record<string, unknown> | undefined {
  const root = entry.value[name];
  if (!isRecord(root)) {
    issues.push({
      code: "xml-root-invalid",
      message: `XML entry "${entry.path}" must have an ${name} root element.`,
      entryPath: entry.path
    });
    return undefined;
  }
  return root;
}

/**
 * Reads all direct child elements with one normalized name.
 *
 * @param parent - Parsed parent element.
 * @param name - Namespace-normalized child element name.
 * @returns Child element objects in document order.
 */
export function getOFDPackageXmlChildren(
  parent: Record<string, unknown>,
  name: string
): readonly Record<string, unknown>[] {
  const value = parent[name];
  const values = Array.isArray(value) ? value : [value];
  return values.filter(isRecord);
}

/**
 * Reads the first direct child element with one normalized name.
 *
 * @param parent - Parsed parent element.
 * @param name - Namespace-normalized child element name.
 * @returns First child element, if present.
 */
export function getOFDPackageXmlChild(
  parent: Record<string, unknown>,
  name: string
): Record<string, unknown> | undefined {
  return getOFDPackageXmlChildren(parent, name)[0];
}

/**
 * Reads XML text from a parsed element or scalar node.
 *
 * @param value - Parsed XML node.
 * @returns Trimmed text content when present.
 */
export function getOFDPackageXmlText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text.length > 0 ? text : undefined;
  }
  if (!isRecord(value)) return undefined;
  return getOFDPackageXmlText(value["#text"]);
}

/**
 * Reads a string-valued XML attribute.
 *
 * @param element - Parsed XML element.
 * @param name - Attribute name without the parser prefix.
 * @returns Attribute value when present.
 */
export function getOFDPackageXmlAttribute(
  element: Record<string, unknown>,
  name: string
): string | undefined {
  const value = element[`@_${name}`];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
}

/**
 * Tests whether a parsed XML value is an object element.
 *
 * @param value - Parsed XML value.
 * @returns Whether the value is an XML element object.
 */
export function isOFDPackageXmlRecord(
  value: unknown
): value is Record<string, unknown> {
  return isRecord(value);
}

/**
 * Tests whether one unknown value is a non-null record.
 *
 * @param value - Candidate value.
 * @returns Whether the candidate is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
