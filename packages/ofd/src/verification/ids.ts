import {
  getOFDPackageXmlAttribute,
  getOFDPackageXmlChild,
  getOFDPackageXmlText,
  isOFDPackageXmlRecord,
  requireOFDPackageXmlRoot,
  type OFDPackageXmlEntry
} from "./xml";
import type { OFDPackageVerificationIssue } from "./types";

const standardUnitIdElementNames = new Set([
  "Page",
  "PageBlock",
  "TemplatePage",
  "Layer",
  "TextObject",
  "PathObject",
  "ImageObject",
  "CompositeObject",
  "Font",
  "ColorSpace",
  "DrawParam",
  "MultiMedia",
  "CompositeGraphicUnit",
  "Annot"
]);

const optionalNumericIdElementNames = new Set([
  "Attachment"
]);

/**
 * Validates the document-global numeric ID domain and `MaxUnitID` lower bound.
 *
 * @param entries - Parsed XML entries keyed by package path.
 * @param documentPath - Resolved `Document.xml` package path.
 * @param issues - Mutable issue sink.
 */
export function verifyOFDPackageIds(
  entries: ReadonlyMap<string, OFDPackageXmlEntry>,
  documentPath: string | undefined,
  issues: OFDPackageVerificationIssue[]
): void {
  const ids = new Map<string, string>();
  let maximumId = 0;
  for (const entry of entries.values()) {
    visitXmlValue(entry.value, entry.path, undefined, ids, issues, (id) => {
      maximumId = Math.max(maximumId, Number(id));
    });
  }
  if (!documentPath) return;
  const documentEntry = entries.get(documentPath);
  if (!documentEntry) return;
  const root = requireOFDPackageXmlRoot(documentEntry, "Document", issues);
  const commonData = root && getOFDPackageXmlChild(root, "CommonData");
  const maxUnitId = commonData && getOFDPackageXmlText(commonData.MaxUnitID);
  if (!maxUnitId) {
    issues.push({
      code: "max-unit-id-missing",
      message: "Document.xml must declare CommonData/MaxUnitID.",
      entryPath: documentPath
    });
    return;
  }
  if (!isPositiveInteger(maxUnitId)) {
    issues.push({
      code: "max-unit-id-invalid",
      message: `Document.xml has invalid MaxUnitID "${maxUnitId}".`,
      entryPath: documentPath,
      id: maxUnitId
    });
    return;
  }
  if (Number(maxUnitId) < maximumId) {
    issues.push({
      code: "max-unit-id-mismatch",
      message: `Document.xml MaxUnitID ${maxUnitId} must not be lower than emitted maximum ID ${maximumId}.`,
      entryPath: documentPath,
      id: maxUnitId
    });
  }
}

/**
 * Visits standard `ST_ID` elements and records their `ID` attributes in document order.
 *
 * @param value - Parsed XML value.
 * @param entryPath - Owning package entry.
 * @param elementName - Name of the XML element represented by `value`.
 * @param ids - Mutable ID-to-entry map.
 * @param issues - Mutable issue sink.
 * @param onId - Callback receiving each valid unique numeric ID.
 */
function visitXmlValue(
  value: unknown,
  entryPath: string,
  elementName: string | undefined,
  ids: Map<string, string>,
  issues: OFDPackageVerificationIssue[],
  onId: (id: string) => void
): void {
  if (Array.isArray(value)) {
    for (const child of value) {
      visitXmlValue(child, entryPath, elementName, ids, issues, onId);
    }
    return;
  }
  if (!isOFDPackageXmlRecord(value)) return;
  const requiresNumericId = elementName !== undefined
    && standardUnitIdElementNames.has(elementName);
  const acceptsNumericId = elementName !== undefined
    && optionalNumericIdElementNames.has(elementName);
  const candidateId = requiresNumericId || acceptsNumericId
    ? getOFDPackageXmlAttribute(value, "ID")
    : undefined;
  const id = candidateId !== undefined
    && (requiresNumericId || isPositiveInteger(candidateId))
    ? candidateId
    : undefined;
  if (id !== undefined) {
    if (!isPositiveInteger(id)) {
      issues.push({
        code: "id-invalid",
        message: `OFD ID "${id}" in "${entryPath}" must be a positive integer.`,
        entryPath,
        id
      });
    } else if (ids.has(id)) {
      issues.push({
        code: "id-duplicate",
        message: `OFD ID "${id}" is duplicated by "${entryPath}" and "${ids.get(id)}".`,
        entryPath,
        id
      });
    } else {
      ids.set(id, entryPath);
      onId(id);
    }
  }
  for (const [childName, child] of Object.entries(value)) {
    if (childName.startsWith("@_")) continue;
    visitXmlValue(child, entryPath, childName, ids, issues, onId);
  }
}

/**
 * Tests whether a string contains one positive base-10 integer.
 *
 * @param value - Candidate ID value.
 * @returns Whether the value is a valid positive integer.
 */
function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/u.test(value);
}
