import type { OFDPackageVerificationIssue } from "./types";
import type { OFDPackageXmlEntry } from "./xml";

/**
 * Requires one parsed XML entry at an existing package path.
 *
 * @param path - Existing package path that must contain XML.
 * @param entries - Successfully parsed XML entries.
 * @param issues - Mutable issue sink.
 * @returns Parsed XML entry, if available.
 */
export function requireOFDPackageXmlEntry(
  path: string,
  entries: ReadonlyMap<string, OFDPackageXmlEntry>,
  issues: OFDPackageVerificationIssue[]
): OFDPackageXmlEntry | undefined {
  const entry = entries.get(path);
  if (!entry) {
    issues.push({
      code: "xml-invalid",
      message: `Required XML entry "${path}" is absent or malformed.`,
      entryPath: path
    });
  }
  return entry;
}
