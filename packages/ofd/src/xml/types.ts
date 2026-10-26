/** Scalar value accepted by one XML attribute. */
export type OFDXmlAttributeValue = string | number | boolean | undefined;

/** Ordered child accepted by the deterministic XML writer. */
export type OFDXmlNode = OFDXmlElement | string;

/** Immutable XML element without raw-markup interpolation. */
export interface OFDXmlElement {
  /** Qualified XML element name. */
  readonly name: string;
  /** Attributes in deterministic insertion order. */
  readonly attributes: Readonly<Record<string, OFDXmlAttributeValue>>;
  /** Ordered child elements and escaped text. */
  readonly children: readonly OFDXmlNode[];
}
