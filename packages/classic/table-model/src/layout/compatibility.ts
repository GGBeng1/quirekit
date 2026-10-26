/** Compatibility decisions cached by immutable root attributes, never by document text. */
const legacyOrigins = new WeakMap<object, boolean>();

/**
 * Reads the imported compatibility policy without decoding unrelated package data.
 * Plain string fields are unchanged by the preservation encoder. Native documents
 * without source settings keep the existing neutral placement convention.
 * @param attrs - Immutable document attributes.
 * @returns Whether imported Word 2003–2010 table origins apply.
 */
export function usesLegacyWordTableOrigin(attrs: Readonly<Record<string, unknown>>): boolean {
  const cached = legacyOrigins.get(attrs);
  if (cached !== undefined) return cached;
  const source = record(attrs.litAstDocumentPreservation);
  const settings = record(record(source?.meta)?.rawXmlFiles)?.settingsXml;
  const legacy = typeof settings === "string" && readCompatibilityMode(settings) < 15;
  legacyOrigins.set(attrs, legacy);
  return legacy;
}

/**
 * Extracts the supported compatibility setting; unknown explicit values stay neutral.
 * @param xml - Preserved settings part.
 * @returns Supported mode, or 15 for an unknown explicit mode. Omission defaults to 12.
 */
function readCompatibilityMode(xml: string): number {
  const markup = xml.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/gu, "");
  for (const tag of markup.matchAll(/<(?:[\w.-]+:)?compatSetting\b([^>]*)>/gu)) {
    const attributes = new Map([...tag[1]!.matchAll(/(?:[\w.-]+:)?([\w.-]+)\s*=\s*(["'])(.*?)\2/gu)]
      .map(match => [match[1]!, match[3]!]));
    if (attributes.get("name") !== "compatibilityMode"
      || attributes.get("uri") !== "http://schemas.microsoft.com/office/word") continue;
    const mode = Number(attributes.get("val"));
    return mode === 11 || mode === 12 || mode === 14 ? mode : 15;
  }
  return 12;
}

/**
 * Narrows an opaque preservation object before reading its plain fields.
 * @param value - Candidate record.
 * @returns Object record, or undefined.
 */
function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>> : undefined;
}
