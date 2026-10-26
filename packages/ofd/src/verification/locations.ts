import {
  resolveOFDPackageLocation,
  resolveOFDPackageResourceLocation
} from "./path";
import type { OFDPackageVerificationIssue } from "./types";

/**
 * Resolves and requires one location relative to an XML entry.
 *
 * @param ownerPath - XML entry declaring the location.
 * @param location - Relative OFD location text.
 * @param entries - Unpacked package entries.
 * @param issues - Mutable issue sink.
 * @param label - Human-readable reference label.
 * @returns Resolved existing package path, if valid.
 */
export function requireOFDPackageLocation(
  ownerPath: string,
  location: string,
  entries: ReadonlyMap<string, Uint8Array>,
  issues: OFDPackageVerificationIssue[],
  label: string
): string | undefined {
  const path = resolveOFDPackageLocation(ownerPath, location);
  return requireResolvedLocation(ownerPath, location, path, entries, issues, label);
}

/**
 * Resolves and requires one resource location through an optional `BaseLoc`.
 *
 * @param ownerPath - Resource XML entry declaring the location.
 * @param baseLocation - Optional resource `BaseLoc`.
 * @param location - Relative resource location text.
 * @param entries - Unpacked package entries.
 * @param issues - Mutable issue sink.
 * @param label - Human-readable reference label.
 * @returns Resolved existing package path, if valid.
 */
export function requireOFDPackageResourceLocation(
  ownerPath: string,
  baseLocation: string | undefined,
  location: string,
  entries: ReadonlyMap<string, Uint8Array>,
  issues: OFDPackageVerificationIssue[],
  label: string
): string | undefined {
  const path = resolveOFDPackageResourceLocation(ownerPath, baseLocation, location);
  return requireResolvedLocation(ownerPath, location, path, entries, issues, label);
}

/**
 * Emits a location failure unless a resolved path names an existing entry.
 *
 * @param ownerPath - XML entry declaring the location.
 * @param location - Original untrusted location text.
 * @param path - Resolved normalized package path.
 * @param entries - Unpacked package entries.
 * @param issues - Mutable issue sink.
 * @param label - Human-readable reference label.
 * @returns Existing normalized package path, if valid.
 */
function requireResolvedLocation(
  ownerPath: string,
  location: string,
  path: string | undefined,
  entries: ReadonlyMap<string, Uint8Array>,
  issues: OFDPackageVerificationIssue[],
  label: string
): string | undefined {
  if (!path) {
    issues.push({
      code: "location-invalid",
      message: `${label} location "${location}" in "${ownerPath}" is unsafe.`,
      entryPath: ownerPath,
      location
    });
    return undefined;
  }
  if (!entries.has(path)) {
    issues.push({
      code: "location-missing",
      message: `${label} location "${location}" in "${ownerPath}" does not resolve to an archive entry.`,
      entryPath: ownerPath,
      location: path
    });
    return undefined;
  }
  return path;
}
