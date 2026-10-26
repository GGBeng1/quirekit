import type { OFDPackageVerificationIssue } from "./types";
import {
  getOFDPackageXmlAttribute,
  getOFDPackageXmlChild,
  getOFDPackageXmlChildren,
  type OFDPackageXmlEntry
} from "./xml";

/**
 * Verifies the restricted action subset emitted for `Document/Actions`.
 *
 * @param documentEntry - Parsed `Document.xml` entry.
 * @param document - Parsed `Document` root.
 * @param issues - Mutable package-verification issue sink.
 */
export function verifyOFDDocumentOpenActions(
  documentEntry: OFDPackageXmlEntry,
  document: Record<string, unknown>,
  issues: OFDPackageVerificationIssue[]
): void {
  const actions = getOFDPackageXmlChildren(document, "Actions");
  if (actions.length > 1) {
    addInvalidActionIssue(documentEntry.path, issues, "Document.xml can contain only one Actions element.");
  }
  const pageIds = collectPageIds(document);
  const bookmarkNames = collectBookmarkNames(document);
  for (const actionsElement of actions) {
    const actionsList = getOFDPackageXmlChildren(actionsElement, "Action");
    if (actionsList.length === 0) {
      addInvalidActionIssue(documentEntry.path, issues, "Document Actions must contain at least one Action.");
    }
    for (const action of actionsList) {
      verifyOFDDocumentOpenAction(
        documentEntry.path,
        action,
        pageIds,
        bookmarkNames,
        issues
      );
    }
  }
}

/**
 * Validates one `Event="DO"` action and its typed target reference.
 *
 * @param entryPath - Owning `Document.xml` package path.
 * @param action - Parsed action element.
 * @param pageIds - Numeric identifiers declared by the document page tree.
 * @param bookmarkNames - Declared named bookmark targets.
 * @param issues - Mutable package-verification issue sink.
 */
function verifyOFDDocumentOpenAction(
  entryPath: string,
  action: Record<string, unknown>,
  pageIds: ReadonlySet<string>,
  bookmarkNames: ReadonlySet<string>,
  issues: OFDPackageVerificationIssue[]
): void {
  if (getOFDPackageXmlAttribute(action, "Event") !== "DO") {
    addInvalidActionIssue(entryPath, issues, "Document actions must use Event=\"DO\".");
  }
  if (getOFDPackageXmlChild(action, "Region")) {
    addInvalidActionIssue(entryPath, issues, "Document-open actions cannot contain Region.");
  }
  const gotoTargets = getOFDPackageXmlChildren(action, "Goto");
  const unsupportedTargetNames = ["URI", "GotoA", "Sound", "Movie"];
  const unsupported = unsupportedTargetNames.some((name) =>
    getOFDPackageXmlChildren(action, name).length > 0
  );
  if (gotoTargets.length !== 1 || unsupported) {
    addInvalidActionIssue(entryPath, issues, "Document-open actions must contain exactly one Goto target.");
    return;
  }
  const goto = gotoTargets[0]!;
  const destinations = getOFDPackageXmlChildren(goto, "Dest");
  const bookmarks = getOFDPackageXmlChildren(goto, "Bookmark");
  if (destinations.length + bookmarks.length !== 1) {
    addInvalidActionIssue(entryPath, issues, "Goto must contain exactly one Dest or Bookmark.");
    return;
  }
  if (destinations.length === 1) {
    const destination = destinations[0]!;
    const type = getOFDPackageXmlAttribute(destination, "Type");
    if (!isDestinationType(type)) {
      addInvalidActionIssue(entryPath, issues, "Document Goto/Dest must declare a standard destination Type.");
    }
    const pageId = getOFDPackageXmlAttribute(destination, "PageID");
    if (!pageId || !pageIds.has(pageId)) {
      issues.push({
        code: "action-reference-missing",
        message: "Document Goto/Dest must reference a declared page ID.",
        entryPath,
        ...(pageId ? { id: pageId } : {})
      });
    }
    return;
  }
  const bookmarkName = getOFDPackageXmlAttribute(bookmarks[0]!, "Name");
  if (!bookmarkName || !bookmarkNames.has(bookmarkName)) {
    issues.push({
      code: "action-reference-missing",
      message: "Document Goto/Bookmark must reference a declared bookmark.",
      entryPath
    });
  }
}

/**
 * Tests one serialized standard destination mode.
 *
 * @param value - Destination type attribute value.
 * @returns Whether the value is a supported standard mode.
 */
function isDestinationType(value: string | undefined): boolean {
  return value === "XYZ" || value === "Fit" || value === "FitH"
    || value === "FitV" || value === "FitR";
}

/**
 * Collects page-tree IDs accepted by document-open destinations.
 *
 * @param document - Parsed `Document` root.
 * @returns Declared page identifiers.
 */
function collectPageIds(document: Record<string, unknown>): ReadonlySet<string> {
  const pages = getOFDPackageXmlChild(document, "Pages");
  return new Set(getOFDPackageXmlChildren(pages ?? {}, "Page")
    .map((page) => getOFDPackageXmlAttribute(page, "ID"))
    .filter((id): id is string => id !== undefined));
}

/**
 * Collects direct document bookmark names emitted by the standalone writer.
 *
 * @param document - Parsed `Document` root.
 * @returns Declared bookmark names.
 */
function collectBookmarkNames(document: Record<string, unknown>): ReadonlySet<string> {
  const bookmarks = getOFDPackageXmlChild(document, "Bookmarks");
  return new Set(getOFDPackageXmlChildren(bookmarks ?? {}, "Bookmark")
    .map((bookmark) => getOFDPackageXmlAttribute(bookmark, "Name"))
    .filter((name): name is string => name !== undefined));
}

/**
 * Adds one stable malformed-action issue.
 *
 * @param entryPath - Owning package path.
 * @param issues - Mutable issue sink.
 * @param message - Human-readable failure explanation.
 */
function addInvalidActionIssue(
  entryPath: string,
  issues: OFDPackageVerificationIssue[],
  message: string
): void {
  issues.push({ code: "action-invalid", message, entryPath });
}
