/**
 * Resolves one package location relative to an owning XML entry.
 *
 * @param ownerPath - Package path of the XML entry declaring the location.
 * @param location - Relative OFD location value.
 * @returns Normalized package path, or undefined when the location is unsafe.
 */
export function resolveOFDPackageLocation(
  ownerPath: string,
  location: string
): string | undefined {
  return resolveFromDirectory(directoryOf(ownerPath), location);
}

/**
 * Resolves one resource location through an OFD resource `BaseLoc` directory.
 *
 * @param ownerPath - Package path of the resource XML entry.
 * @param baseLocation - Resource `BaseLoc` relative to the XML entry.
 * @param location - Resource location relative to `BaseLoc`.
 * @returns Normalized package path, or undefined when either location is unsafe.
 */
export function resolveOFDPackageResourceLocation(
  ownerPath: string,
  baseLocation: string | undefined,
  location: string
): string | undefined {
  if (!baseLocation) return resolveOFDPackageLocation(ownerPath, location);
  const basePath = resolveOFDPackageLocation(ownerPath, baseLocation);
  return basePath === undefined
    ? undefined
    : resolveFromDirectory(basePath, location);
}

/**
 * Determines whether one unpacked ZIP entry path stays within the package root.
 *
 * @param path - Candidate package entry path.
 * @returns Whether the path is a normalized relative package location.
 */
export function isSafeOFDPackagePath(path: string): boolean {
  return path.length > 0
    && !path.startsWith("/")
    && !path.includes("\\")
    && !path.includes("\0")
    && path.split("/").every((part) => (
      part.length > 0 && part !== "." && part !== ".."
    ));
}

/**
 * Resolves one relative location from an already normalized package directory.
 *
 * @param directory - Normalized package directory without a trailing slash.
 * @param location - Relative location within the directory.
 * @returns Normalized path, or undefined for an unsafe location.
 */
function resolveFromDirectory(
  directory: string,
  location: string
): string | undefined {
  if (!isSafeOFDPackagePath(location)) return undefined;
  const path = directory.length === 0 ? location : `${directory}/${location}`;
  return isSafeOFDPackagePath(path) ? path : undefined;
}

/**
 * Gets the directory containing one package entry.
 *
 * @param path - Normalized package entry path.
 * @returns Containing directory without a trailing slash.
 */
function directoryOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}
