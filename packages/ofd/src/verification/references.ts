import { requireOFDPackageXmlEntry } from "./entries";
import { requireOFDPackageLocation } from "./locations";
import {
  verifyOFDCompositeResourceObjectReferences,
  verifyOFDPageObjectReferences
} from "./objects";
import { collectOFDPageLocations } from "./pages";
import {
  collectOFDFontReferences,
  collectOFDImageReferences,
  verifyOFDAttachmentReferences
} from "./resources";
import type { OFDPackageVerificationIssue } from "./types";
import {
  getOFDPackageXmlChild,
  getOFDPackageXmlText,
  requireOFDPackageXmlRoot,
  type OFDPackageXmlEntry
} from "./xml";
import { verifyOFDDocumentOpenActions } from "./actions";

/** Result of resolving the required OFD entry-point document graph. */
export interface OFDPackageReferenceGraph {
  /** Resolved main document path, when the entry point is structurally valid. */
  readonly documentPath?: string;
  /** Resolved page content paths in declared page order. */
  readonly pagePaths: readonly string[];
  /** Font resource identifiers resolved from public resources. */
  readonly fontIds: ReadonlySet<string>;
  /** Multimedia resource identifiers resolved from document resources. */
  readonly imageIds: ReadonlySet<string>;
  /** Composite graphic-unit identifiers resolved from document resources. */
  readonly compositeIds: ReadonlySet<string>;
}

/**
 * Validates OFD package locations and object-to-resource references.
 *
 * @param entries - Unpacked package entries keyed by normalized path.
 * @param xmlEntries - Successfully parsed XML entries keyed by path.
 * @param issues - Mutable issue sink.
 * @returns Resolved document graph facts for the ID verifier.
 */
export function verifyOFDPackageReferences(
  entries: ReadonlyMap<string, Uint8Array>,
  xmlEntries: ReadonlyMap<string, OFDPackageXmlEntry>,
  issues: OFDPackageVerificationIssue[]
): OFDPackageReferenceGraph {
  const fontIds = new Set<string>();
  const imageIds = new Set<string>();
  const compositeIds = new Set<string>();
  const entryPoint = requireOFDPackageXmlEntry("OFD.xml", xmlEntries, issues);
  if (!entryPoint) return createReferenceGraph(undefined, [], fontIds, imageIds, compositeIds);
  const ofd = requireOFDPackageXmlRoot(entryPoint, "OFD", issues);
  const docBody = ofd && getOFDPackageXmlChild(ofd, "DocBody");
  const docRoot = docBody && getOFDPackageXmlText(docBody.DocRoot);
  const documentPath = docRoot
    ? requireOFDPackageLocation(entryPoint.path, docRoot, entries, issues, "DocRoot")
    : undefined;
  if (!documentPath) {
    if (!docRoot) addMissingDocRootIssue(entryPoint.path, issues);
    return createReferenceGraph(undefined, [], fontIds, imageIds, compositeIds);
  }
  const documentEntry = requireOFDPackageXmlEntry(documentPath, xmlEntries, issues);
  const document = documentEntry && requireOFDPackageXmlRoot(documentEntry, "Document", issues);
  if (!documentEntry || !document) {
    return createReferenceGraph(documentPath, [], fontIds, imageIds, compositeIds);
  }

  verifyOFDDocumentOpenActions(documentEntry, document, issues);
  collectDocumentResources(documentEntry, document, entries, xmlEntries, fontIds, imageIds, compositeIds, issues);
  const pagePaths = collectOFDPageLocations(documentEntry, document, entries, issues);
  for (const pagePath of pagePaths) {
    verifyOFDPageObjectReferences(pagePath, xmlEntries, entries, fontIds, imageIds, compositeIds, issues);
  }
  return createReferenceGraph(documentPath, pagePaths, fontIds, imageIds, compositeIds);
}

/**
 * Validates resource-list and attachment locations declared by the main document.
 *
 * @param documentEntry - Parsed main document entry.
 * @param document - Main document root element.
 * @param entries - Unpacked package entries.
 * @param xmlEntries - Parsed XML entries.
 * @param fontIds - Mutable public font ID set.
 * @param imageIds - Mutable document multimedia ID set.
 * @param issues - Mutable issue sink.
 */
function collectDocumentResources(
  documentEntry: OFDPackageXmlEntry,
  document: Record<string, unknown>,
  entries: ReadonlyMap<string, Uint8Array>,
  xmlEntries: ReadonlyMap<string, OFDPackageXmlEntry>,
  fontIds: Set<string>,
  imageIds: Set<string>,
  compositeIds: Set<string>,
  issues: OFDPackageVerificationIssue[]
): void {
  const commonData = getOFDPackageXmlChild(document, "CommonData");
  const publicRes = commonData && getOFDPackageXmlText(commonData.PublicRes);
  const documentRes = commonData && getOFDPackageXmlText(commonData.DocumentRes);
  if (publicRes) {
    const path = requireOFDPackageLocation(
      documentEntry.path,
      publicRes,
      entries,
      issues,
      "PublicRes"
    );
    if (path) collectOFDFontReferences(path, xmlEntries, entries, fontIds, issues);
  }
  if (documentRes) {
    const path = requireOFDPackageLocation(
      documentEntry.path,
      documentRes,
      entries,
      issues,
      "DocumentRes"
    );
    if (path) {
      collectOFDImageReferences(path, xmlEntries, entries, imageIds, compositeIds, issues);
      verifyOFDCompositeResourceObjectReferences(
        path,
        xmlEntries,
        fontIds,
        imageIds,
        compositeIds,
        issues
      );
    }
  }
  const attachments = getOFDPackageXmlText(document.Attachments);
  if (attachments) {
    const path = requireOFDPackageLocation(
      documentEntry.path,
      attachments,
      entries,
      issues,
      "Attachments"
    );
    if (path) verifyOFDAttachmentReferences(path, xmlEntries, entries, issues);
  }
}

/**
 * Reports a missing package entry-point document location.
 *
 * @param entryPath - OFD entry-point XML path.
 * @param issues - Mutable issue sink.
 */
function addMissingDocRootIssue(
  entryPath: string,
  issues: OFDPackageVerificationIssue[]
): void {
  issues.push({
    code: "required-entry-missing",
    message: "OFD.xml must contain DocBody/DocRoot.",
    entryPath
  });
}

/**
 * Creates immutable reference graph output.
 *
 * @param documentPath - Optional resolved main document path.
 * @param pagePaths - Resolved page content paths.
 * @param fontIds - Resolved font resource IDs.
 * @param imageIds - Resolved multimedia resource IDs.
 * @returns Frozen package graph facts.
 */
function createReferenceGraph(
  documentPath: string | undefined,
  pagePaths: readonly string[],
  fontIds: ReadonlySet<string>,
  imageIds: ReadonlySet<string>
  , compositeIds: ReadonlySet<string>
): OFDPackageReferenceGraph {
  return Object.freeze({
    ...(documentPath ? { documentPath } : {}),
    pagePaths: Object.freeze([...pagePaths]),
    fontIds: new Set(fontIds),
    imageIds: new Set(imageIds),
    compositeIds: new Set(compositeIds)
  });
}
