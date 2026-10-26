import { requireOFDPackageLocation } from "./locations";
import type { OFDPackageVerificationIssue } from "./types";
import {
  getOFDPackageXmlAttribute,
  getOFDPackageXmlChild,
  getOFDPackageXmlChildren,
  type OFDPackageXmlEntry
} from "./xml";

/**
 * Collects all page content locations declared by `Document.xml`.
 *
 * @param documentEntry - Parsed main document entry.
 * @param document - Main document root element.
 * @param entries - Unpacked package entries.
 * @param issues - Mutable issue sink.
 * @returns Resolved page content paths in declared order.
 */
export function collectOFDPageLocations(
  documentEntry: OFDPackageXmlEntry,
  document: Record<string, unknown>,
  entries: ReadonlyMap<string, Uint8Array>,
  issues: OFDPackageVerificationIssue[]
): readonly string[] {
  const pages = getOFDPackageXmlChild(document, "Pages");
  if (!pages) {
    issues.push({
      code: "required-entry-missing",
      message: "Document.xml must contain a Pages element.",
      entryPath: documentEntry.path
    });
    return [];
  }
  const paths: string[] = [];
  for (const page of getOFDPackageXmlChildren(pages, "Page")) {
    const location = getOFDPackageXmlAttribute(page, "BaseLoc");
    if (!location) {
      issues.push({
        code: "location-invalid",
        message: "Each Document.xml Page requires a relative BaseLoc.",
        entryPath: documentEntry.path
      });
      continue;
    }
    const path = requireOFDPackageLocation(
      documentEntry.path,
      location,
      entries,
      issues,
      "Page BaseLoc"
    );
    if (path) paths.push(path);
  }
  if (paths.length === 0) {
    issues.push({
      code: "required-entry-missing",
      message: "Document.xml must resolve at least one Page BaseLoc.",
      entryPath: documentEntry.path
    });
  }
  return paths;
}
