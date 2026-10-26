import type {
  DocxPackagePartPlan,
  DocxRelationshipPlan,
  DocxRelationshipReference,
  DocxResourcePlan,
  DocxUnsafeXmlPlan,
  DocxXmlElementPlan
} from "../products/index.js";

/** Options accepted when constructing one package part. */
export interface DocxPackagePartOptions {
  /** Explicit typed rule for replacing a known base fallback producer. */
  readonly mergePolicy?: DocxPackagePartPlan["mergePolicy"];
  /** Typed XML root for a structurally generated part. */
  readonly root?: DocxXmlElementPlan | undefined;
  /** Generated XML template with centrally resolved relationship placeholders. */
  readonly generatedXml?: DocxPackagePartPlan["generatedXml"];
  /** Explicit raw XML escape hatch. */
  readonly unsafeXml?: DocxUnsafeXmlPlan | undefined;
  /** Browser-safe binary part content. */
  readonly data?: Uint8Array | undefined;
}

/**
 * Creates one semantic resource request.
 *
 * @param key - Stable semantic resource key.
 * @param kind - Resource family.
 * @param options - Optional media type, bytes, or external source.
 * @returns Frozen resource plan.
 */
export function docxResource(
  key: string,
  kind: string,
  options: {
    readonly mediaType?: string | undefined;
    readonly data?: Uint8Array | undefined;
    readonly source?: string | undefined;
  } = {}
): DocxResourcePlan {
  assertKey(key, "resource");
  assertKey(kind, "resource kind");
  return Object.freeze({
    key,
    kind,
    ...options
  });
}

/**
 * Creates one semantic relationship request.
 *
 * @param key - Stable relationship request key.
 * @param sourcePart - Source package part name.
 * @param relationshipType - OOXML relationship type URI.
 * @param target - Target part name, resource key, or URI.
 * @param targetMode - Internal or external target mode.
 * @param fixedId - Preserved id required by raw XML, when symbolic rewriting is impossible.
 * @returns Frozen relationship plan.
 */
export function docxRelationship(
  key: string,
  sourcePart: string,
  relationshipType: string,
  target: string,
  targetMode: "internal" | "external" = "internal",
  fixedId?: string
): DocxRelationshipPlan {
  assertKey(key, "relationship");
  assertPartName(sourcePart);
  assertKey(relationshipType, "relationship type");
  assertKey(target, "relationship target");
  if (fixedId !== undefined) assertKey(fixedId, "fixed relationship id");
  return Object.freeze({
    key,
    sourcePart,
    relationshipType,
    target,
    targetMode,
    ...(fixedId === undefined ? {} : { fixedId })
  });
}

/**
 * Creates a symbolic relationship reference for a typed XML attribute.
 *
 * @param key - Stable relationship-plan key.
 * @returns Frozen symbolic reference resolved by the package allocator.
 */
export function docxRelationshipReference(
  key: string
): DocxRelationshipReference {
  assertKey(key, "relationship reference");
  return Object.freeze({ kind: "relationship-reference", key });
}

/**
 * Creates one typed package part request.
 *
 * @param name - Absolute OPC part name.
 * @param contentType - MIME content type.
 * @param options - Exactly one typed XML, unsafe XML, or binary payload.
 * @returns Frozen package part plan.
 */
export function docxPackagePart(
  name: string,
  contentType: string,
  options: DocxPackagePartOptions
): DocxPackagePartPlan {
  assertPartName(name);
  assertKey(contentType, "part content type");
  const payloadCount = [
    options.root,
    options.generatedXml,
    options.unsafeXml,
    options.data
  ].filter((value) => value !== undefined).length;
  if (payloadCount !== 1) {
    throw new TypeError(
      `DOCX package part "${name}" requires exactly one payload authority.`
    );
  }
  return Object.freeze({
    name,
    contentType,
    ...options
  });
}

/**
 * Validates one non-empty semantic key.
 *
 * @param value - Candidate key.
 * @param label - Human-readable key family.
 */
function assertKey(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new TypeError(`DOCX ${label} cannot be empty.`);
  }
}

/**
 * Validates one absolute OPC part name.
 *
 * @param name - Candidate package part name.
 */
function assertPartName(name: string): void {
  if (!name.startsWith("/") || name.includes("..")) {
    throw new TypeError(
      `DOCX package part name "${name}" must be absolute and cannot traverse.`
    );
  }
}
