import { unzipSync } from "fflate";
import { isSafeOFDPackagePath } from "./path";
import type {
  OFDPackageVerificationIssue,
  OFDPackageVerificationLimits
} from "./types";

/**
 * Unpacks one untrusted OFD archive after applying portable package limits.
 *
 * @param bytes - Complete OFD ZIP bytes.
 * @param limits - Optional input and unpacked-entry limits.
 * @param issues - Mutable issue sink.
 * @returns Safe unpacked entries keyed by normalized package path.
 */
export function unpackOFDPackage(
  bytes: Uint8Array,
  limits: OFDPackageVerificationLimits | undefined,
  issues: OFDPackageVerificationIssue[]
): ReadonlyMap<string, Uint8Array> {
  if (limits?.maxArchiveBytes !== undefined
    && bytes.byteLength > limits.maxArchiveBytes) {
    issues.push({
      code: "archive-limit-exceeded",
      message: `OFD archive exceeds the ${limits.maxArchiveBytes}-byte input limit.`
    });
    return new Map();
  }
  let unpacked: Record<string, Uint8Array>;
  let observedEntries = 0;
  let observedUnpackedBytes = 0;
  let entryLimitReported = false;
  let totalSizeLimitReported = false;
  const rejectedPaths = new Set<string>();
  try {
    unpacked = unzipSync(bytes, {
      filter(entry) {
        observedEntries += 1;
        observedUnpackedBytes += entry.originalSize;
        if (!isSafeOFDPackagePath(entry.name)) {
          issues.push({
            code: "archive-path-unsafe",
            message: `OFD archive contains unsafe entry path "${entry.name}".`,
            entryPath: entry.name
          });
          rejectedPaths.add(entry.name);
          return false;
        }
        if (limits?.maxEntries !== undefined
          && observedEntries > limits.maxEntries) {
          if (!entryLimitReported) {
            issues.push({
              code: "archive-limit-exceeded",
              message: `OFD archive contains more than ${limits.maxEntries} entries.`
            });
            entryLimitReported = true;
          }
          rejectedPaths.add(entry.name);
          return false;
        }
        if (limits?.maxEntryBytes !== undefined
          && entry.originalSize > limits.maxEntryBytes) {
          issues.push({
            code: "archive-limit-exceeded",
            message: `OFD archive entry "${entry.name}" exceeds the ${limits.maxEntryBytes}-byte limit.`,
            entryPath: entry.name
          });
          rejectedPaths.add(entry.name);
          return false;
        }
        if (limits?.maxTotalEntryBytes !== undefined
          && observedUnpackedBytes > limits.maxTotalEntryBytes) {
          if (!totalSizeLimitReported) {
            issues.push({
              code: "archive-limit-exceeded",
              message: `OFD archive exceeds the ${limits.maxTotalEntryBytes}-byte total unpacked limit.`
            });
            totalSizeLimitReported = true;
          }
          rejectedPaths.add(entry.name);
          return false;
        }
        return true;
      }
    });
  } catch {
    issues.push({
      code: "archive-invalid",
      message: "OFD bytes are not a readable ZIP archive."
    });
    return new Map();
  }
  const paths = Object.keys(unpacked).sort(compareOFDPackagePaths);
  const entries = new Map<string, Uint8Array>();
  for (const path of paths) {
    if (rejectedPaths.has(path)) continue;
    if (!isSafeOFDPackagePath(path)) {
      issues.push({
        code: "archive-path-unsafe",
        message: `OFD archive contains unsafe entry path "${path}".`,
        entryPath: path
      });
      continue;
    }
    const data = unpacked[path];
    if (!data) continue;
    entries.set(path, data);
  }
  return entries;
}

/**
 * Compares package paths with deterministic code-unit ordering.
 *
 * @param left - First path.
 * @param right - Second path.
 * @returns Negative, zero, or positive comparison result.
 */
function compareOFDPackagePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
