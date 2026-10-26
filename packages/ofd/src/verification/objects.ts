import { requireOFDPackageXmlEntry } from "./entries";
import { requireOFDPackageLocation } from "./locations";
import { collectOFDImageReferences } from "./resources";
import type { OFDPackageVerificationIssue } from "./types";
import {
  getOFDPackageXmlAttribute,
  getOFDPackageXmlText,
  isOFDPackageXmlRecord,
  requireOFDPackageXmlRoot,
  type OFDPackageXmlEntry
} from "./xml";

/**
 * Validates text-font and image-resource references used by one page.
 *
 * @param path - Page content XML path.
 * @param xmlEntries - Parsed XML entries.
 * @param fontIds - Declared public font resource IDs.
 * @param imageIds - Declared document multimedia resource IDs.
 * @param compositeIds - Declared composite graphic-unit resource IDs.
 * @param issues - Mutable issue sink.
 */
export function verifyOFDPageObjectReferences(
  path: string,
  xmlEntries: ReadonlyMap<string, OFDPackageXmlEntry>,
  entries: ReadonlyMap<string, Uint8Array>,
  fontIds: ReadonlySet<string>,
  imageIds: ReadonlySet<string>,
  compositeIds: ReadonlySet<string>,
  issues: OFDPackageVerificationIssue[]
): void {
  const entry = requireOFDPackageXmlEntry(path, xmlEntries, issues);
  const page = entry && requireOFDPackageXmlRoot(entry, "Page", issues);
  if (!entry || !page) return;
  const resolvedImageIds = new Set(imageIds);
  const pageRes = getOFDPackageXmlText(page.PageRes);
  if (pageRes) {
    const pageResPath = requireOFDPackageLocation(entry.path, pageRes, entries, issues, "PageRes");
    if (pageResPath) {
      collectOFDImageReferences(
        pageResPath,
        xmlEntries,
        entries,
        resolvedImageIds,
        new Set(),
        issues
      );
    }
  }
  verifyOFDGraphicObjectReferences(path, page, fontIds, resolvedImageIds, compositeIds, issues);
}

/**
 * Validates object references nested inside document-resource composite units.
 *
 * @param path - Document resource XML path.
 * @param xmlEntries - Parsed XML entries.
 * @param fontIds - Declared public font resource IDs.
 * @param imageIds - Declared document multimedia resource IDs.
 * @param compositeIds - Declared composite graphic-unit resource IDs.
 * @param issues - Mutable issue sink.
 */
export function verifyOFDCompositeResourceObjectReferences(
  path: string,
  xmlEntries: ReadonlyMap<string, OFDPackageXmlEntry>,
  fontIds: ReadonlySet<string>,
  imageIds: ReadonlySet<string>,
  compositeIds: ReadonlySet<string>,
  issues: OFDPackageVerificationIssue[]
): void {
  const entry = requireOFDPackageXmlEntry(path, xmlEntries, issues);
  const resource = entry && requireOFDPackageXmlRoot(entry, "Res", issues);
  if (!entry || !resource) return;
  verifyOFDGraphicObjectReferences(path, resource, fontIds, imageIds, compositeIds, issues);
}

/**
 * Validates resource references across one parsed graphic-container subtree.
 *
 * @param path - Package path owning the subtree.
 * @param root - Parsed page or resource root.
 * @param fontIds - Declared public font resource IDs.
 * @param imageIds - Declared document multimedia resource IDs.
 * @param compositeIds - Declared composite graphic-unit resource IDs.
 * @param issues - Mutable issue sink.
 */
function verifyOFDGraphicObjectReferences(
  path: string,
  root: Record<string, unknown>,
  fontIds: ReadonlySet<string>,
  imageIds: ReadonlySet<string>,
  compositeIds: ReadonlySet<string>,
  issues: OFDPackageVerificationIssue[]
): void {
  visitElements(root, "TextObject", (object) => {
    const font = getOFDPackageXmlAttribute(object, "Font");
    if (!font || !fontIds.has(font)) {
      issues.push({
        code: "resource-reference-missing",
        message: `TextObject in "${path}" references missing font "${font ?? ""}".`,
        entryPath: path,
        ...(font ? { id: font } : {})
      });
    }
  });
  visitElements(root, "ImageObject", (object) => {
    const resourceId = getOFDPackageXmlAttribute(object, "ResourceID");
    if (!resourceId || !imageIds.has(resourceId)) {
      issues.push({
        code: "resource-reference-missing",
        message: `ImageObject in "${path}" references missing image "${resourceId ?? ""}".`,
        entryPath: path,
        ...(resourceId ? { id: resourceId } : {})
      });
    }
  });
  visitElements(root, "CompositeObject", (object) => {
    const resourceId = getOFDPackageXmlAttribute(object, "ResourceID");
    if (!resourceId || !compositeIds.has(resourceId)) {
      issues.push({
        code: "resource-reference-missing",
        message: `CompositeObject in "${path}" references missing composite graphic unit "${resourceId ?? ""}".`,
        entryPath: path,
        ...(resourceId ? { id: resourceId } : {})
      });
    }
  });
}

/**
 * Visits all element objects matching one normalized XML element name.
 *
 * @param value - Root parsed XML value.
 * @param name - Element name to visit.
 * @param visit - Callback receiving matching element objects.
 */
function visitElements(
  value: unknown,
  name: string,
  visit: (element: Record<string, unknown>) => void
): void {
  if (Array.isArray(value)) {
    for (const child of value) visitElements(child, name, visit);
    return;
  }
  if (!isOFDPackageXmlRecord(value)) return;
  const matching = value[name];
  for (const element of Array.isArray(matching) ? matching : [matching]) {
    if (isOFDPackageXmlRecord(element)) visit(element);
  }
  for (const child of Object.values(value)) visitElements(child, name, visit);
}
