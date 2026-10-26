import type {
  DocxUnsafeXmlPlan,
  DocxXmlAttributePlan,
  DocxXmlAttributeValue,
  DocxXmlChildPlan,
  DocxXmlElementPlan
} from "../products/index.js";

const xmlLocalNamePattern = /^[A-Za-z_][A-Za-z0-9._-]*$/u;

/**
 * Creates one namespace-aware XML attribute plan.
 *
 * @param namespaceUri - Namespace URI or an empty string.
 * @param localName - Local attribute name without a prefix.
 * @param value - Typed scalar value.
 * @param prefix - Preferred namespace prefix.
 * @returns Frozen XML attribute plan.
 */
export function docxXmlAttribute(
  namespaceUri: string,
  localName: string,
  value: DocxXmlAttributeValue,
  prefix?: string
): DocxXmlAttributePlan {
  assertLocalName(localName);
  return Object.freeze({
    namespaceUri,
    localName,
    value,
    ...(prefix === undefined ? {} : { prefix })
  });
}

/**
 * Creates one namespace-aware XML element plan.
 *
 * @param namespaceUri - Non-empty namespace URI.
 * @param localName - Local element name without a prefix.
 * @param attributes - Typed attributes in declaration order.
 * @param children - Child elements and text in document order.
 * @param prefix - Preferred namespace prefix.
 * @returns Frozen XML element plan.
 */
export function docxXmlElement(
  namespaceUri: string,
  localName: string,
  attributes: readonly DocxXmlAttributePlan[] = [],
  children: readonly DocxXmlChildPlan[] = [],
  prefix?: string
): DocxXmlElementPlan {
  if (namespaceUri.trim().length === 0) {
    throw new TypeError("DOCX XML elements require a namespace URI.");
  }
  assertLocalName(localName);
  return Object.freeze({
    namespaceUri,
    localName,
    attributes: Object.freeze([...attributes]),
    children: Object.freeze([...children]),
    ...(prefix === undefined ? {} : { prefix })
  });
}

/**
 * Creates an auditable raw XML escape-hatch plan.
 *
 * @param xml - Complete raw XML payload.
 * @param reason - Reason the typed builder cannot represent the payload.
 * @param authority - Imported preservation or new authoring authority.
 * @returns Frozen unsafe XML plan.
 */
export function unsafeDocxXml(
  xml: string,
  reason: string,
  authority: "preservation" | "authoring"
): DocxUnsafeXmlPlan {
  if (xml.trim().length === 0) {
    throw new TypeError("Unsafe DOCX XML cannot be empty.");
  }
  if (reason.trim().length === 0) {
    throw new TypeError("Unsafe DOCX XML requires an auditable reason.");
  }
  return Object.freeze({
    kind: "unsafe-xml",
    xml,
    reason,
    authority
  });
}

/**
 * Validates one XML local name.
 *
 * @param localName - Candidate local name.
 */
function assertLocalName(localName: string): void {
  if (!xmlLocalNamePattern.test(localName)) {
    throw new TypeError(`Invalid DOCX XML local name "${localName}".`);
  }
}
