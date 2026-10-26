import { requireOFDPackageXmlEntry } from "./entries";
import {
  requireOFDPackageLocation,
  requireOFDPackageResourceLocation
} from "./locations";
import type { OFDPackageVerificationIssue } from "./types";
import {
  getOFDPackageXmlAttribute,
  getOFDPackageXmlChild,
  getOFDPackageXmlChildren,
  getOFDPackageXmlText,
  requireOFDPackageXmlRoot,
  type OFDPackageXmlEntry
} from "./xml";

/**
 * Collects font IDs and validates every embedded font-file location.
 *
 * @param path - Public resource XML path.
 * @param xmlEntries - Parsed XML entries.
 * @param entries - Unpacked package entries.
 * @param fontIds - Mutable font ID set.
 * @param issues - Mutable issue sink.
 */
export function collectOFDFontReferences(
  path: string,
  xmlEntries: ReadonlyMap<string, OFDPackageXmlEntry>,
  entries: ReadonlyMap<string, Uint8Array>,
  fontIds: Set<string>,
  issues: OFDPackageVerificationIssue[]
): void {
  const entry = requireOFDPackageXmlEntry(path, xmlEntries, issues);
  const resource = entry && requireOFDPackageXmlRoot(entry, "Res", issues);
  if (!entry || !resource) return;
  const baseLocation = getOFDPackageXmlAttribute(resource, "BaseLoc");
  const fonts = getOFDPackageXmlChild(resource, "Fonts");
  for (const font of fonts ? getOFDPackageXmlChildren(fonts, "Font") : []) {
    const id = getOFDPackageXmlAttribute(font, "ID");
    if (id) fontIds.add(id);
    const location = getOFDPackageXmlText(font.FontFile);
    if (location) {
      requireOFDPackageResourceLocation(
        entry.path,
        baseLocation,
        location,
        entries,
        issues,
        "FontFile"
      );
    }
  }
}

/**
 * Collects multimedia IDs and validates every media-file location.
 *
 * @param path - Document resource XML path.
 * @param xmlEntries - Parsed XML entries.
 * @param entries - Unpacked package entries.
 * @param imageIds - Mutable multimedia ID set.
 * @param compositeIds - Mutable composite graphic-unit ID set.
 * @param issues - Mutable issue sink.
 */
export function collectOFDImageReferences(
  path: string,
  xmlEntries: ReadonlyMap<string, OFDPackageXmlEntry>,
  entries: ReadonlyMap<string, Uint8Array>,
  imageIds: Set<string>,
  compositeIds: Set<string>,
  issues: OFDPackageVerificationIssue[]
): void {
  const entry = requireOFDPackageXmlEntry(path, xmlEntries, issues);
  const resource = entry && requireOFDPackageXmlRoot(entry, "Res", issues);
  if (!entry || !resource) return;
  const baseLocation = getOFDPackageXmlAttribute(resource, "BaseLoc");
  const media = getOFDPackageXmlChild(resource, "MultiMedias");
  for (const item of media ? getOFDPackageXmlChildren(media, "MultiMedia") : []) {
    const id = getOFDPackageXmlAttribute(item, "ID");
    if (id) imageIds.add(id);
    const location = getOFDPackageXmlText(item.MediaFile);
    if (location) {
      requireOFDPackageResourceLocation(
        entry.path,
        baseLocation,
        location,
        entries,
        issues,
        "MediaFile"
      );
    }
  }
  const composites = getOFDPackageXmlChild(resource, "CompositeGraphicUnits");
  for (const composite of composites
    ? getOFDPackageXmlChildren(composites, "CompositeGraphicUnit")
    : []) {
    const id = getOFDPackageXmlAttribute(composite, "ID");
    if (id) compositeIds.add(id);
  }
}

/**
 * Validates attachment file locations referenced from `Attachments.xml`.
 *
 * @param path - Attachment XML path.
 * @param xmlEntries - Parsed XML entries.
 * @param entries - Unpacked package entries.
 * @param issues - Mutable issue sink.
 */
export function verifyOFDAttachmentReferences(
  path: string,
  xmlEntries: ReadonlyMap<string, OFDPackageXmlEntry>,
  entries: ReadonlyMap<string, Uint8Array>,
  issues: OFDPackageVerificationIssue[]
): void {
  const entry = requireOFDPackageXmlEntry(path, xmlEntries, issues);
  const root = entry && requireOFDPackageXmlRoot(entry, "Attachments", issues);
  if (!entry || !root) return;
  for (const attachment of getOFDPackageXmlChildren(root, "Attachment")) {
    const location = getOFDPackageXmlText(attachment.FileLoc);
    if (!location) {
      issues.push({
        code: "location-invalid",
        message: "Each Attachment requires a FileLoc.",
        entryPath: entry.path
      });
      continue;
    }
    requireOFDPackageLocation(entry.path, location, entries, issues, "Attachment FileLoc");
  }
}
