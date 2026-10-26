import { XMLParser, XMLValidator } from "fast-xml-parser";
import { xmindRecord } from "../reading";

/** @param value - Optional XML child. @param path - Diagnostic path. @returns A child record, including empty elements. */
export function xmlRecord(value: unknown, path: string): Record<string, unknown> {
  return value === "" ? {} : xmindRecord(value, path);
}

/** @param value - XML title content. @param path - Field location. @returns Literal title and attribute paths retained for the shared loss report. */
export function titleFields(value: unknown, path: string): Record<string, unknown> {
  if (typeof value === "string") return { title: value };
  const record = xmindRecord(value, path);
  const text = record["#text"] ?? "";
  if (typeof text !== "string" || Object.keys(record).some(key => key !== "#text" && !key.startsWith("@"))) {
    throw new TypeError(`${path}: expected plain title text`);
  }
  // XML attributes wrap otherwise plain text in an object. Keep the exact text,
  // and let the common reader report unconverted attributes at their title paths.
  return { title: text, ...Object.fromEntries(Object.entries(record)
    .filter(([key]) => key !== "#text").map(([key, value]) => [`title.${key}`, value])) };
}

/** @param record - XML record. @param consumed - Fields converted or known inert. @returns Other fields, retained for diagnostics. */
export function extras(record: Record<string, unknown>, consumed: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !consumed.includes(key)));
}


/** @param source - Bounded XML. @param namespaces - Whether style namespace keys are retained. @returns Validated inert XML object. */
export function parseXml(source: string, namespaces = false): Record<string, unknown> {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/iu.test(source)) throw new TypeError("XMind: XML entities or DTD are unsupported");
  if (XMLValidator.validate(source) !== true) throw new TypeError("XMind: invalid XML");
  return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", parseTagValue: false, parseAttributeValue: false, trimValues: false, removeNSPrefix: !namespaces, ignoreDeclaration: true, ignorePiTags: true, processEntities: true, htmlEntities: true, isArray: name => ["sheet", "topic", "topics", "style", "relationship", "boundary", "summary", "marker-ref"].includes(name) }).parse(source);
}
