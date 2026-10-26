import {
  strToU8,
  zipSync,
  type Zippable
} from "fflate";
import type { OFDPackageEntryData } from "./types";

/**
 * Creates deterministic OFD ZIP bytes.
 *
 * @param entries - Encoder-owned package paths and content.
 * @returns Complete OFD ZIP bytes.
 */
export function createOFDArchive(
  entries: ReadonlyMap<string, OFDPackageEntryData>
): Uint8Array {
  const archive: Zippable = {};
  const fixedTimestamp = new Date(1980, 0, 1, 0, 0, 0);
  const sortedEntries = [...entries].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  for (const [path, value] of sortedEntries) {
    validatePackagePath(path);
    const data = typeof value === "string" ? strToU8(value) : value;
    archive[path] = [data, {
      level: path.endsWith(".xml") ? 6 : 0,
      mtime: fixedTimestamp,
      os: 3,
      attrs: 0o644 << 16
    }];
  }
  return zipSync(archive);
}

/**
 * Rejects package paths that could escape the OFD root.
 *
 * @param path - Candidate package path.
 */
function validatePackagePath(path: string): void {
  if (path.length === 0
    || path.startsWith("/")
    || path.includes("\\")
    || path.split("/").some((segment) =>
      segment.length === 0 || segment === "." || segment === ".."
    )) {
    throw new TypeError(`Unsafe OFD package path: "${path}".`);
  }
}
