import { unpackOFDPackage } from "./archive";
import { verifyOFDPackageIds } from "./ids";
import { verifyOFDPackageReferences } from "./references";
import {
  OFDPackageVerificationError,
  type OFDPackageVerificationIssue,
  type OFDPackageVerificationOptions,
  type OFDPackageVerificationResult
} from "./types";
import { parseOFDPackageXmlEntries } from "./xml";

const utf8Decoder = new TextDecoder();

/**
 * Verifies an in-memory OFD package without filesystem, DOM, or network access.
 *
 * @param bytes - Complete ZIP-encoded OFD package bytes.
 * @param options - Optional strict mode and archive limits.
 * @returns Immutable structural verification result.
 * @throws OFDPackageVerificationError when strict mode finds an issue.
 */
export function verifyOFDPackage(
  bytes: Uint8Array,
  options: OFDPackageVerificationOptions = {}
): OFDPackageVerificationResult {
  const issues: OFDPackageVerificationIssue[] = [];
  const entries = unpackOFDPackage(bytes, options.limits, issues);
  requirePackageEntry(entries, "OFD.xml", issues);
  const xmlEntries = parseOFDPackageXmlEntries(entries, utf8Decoder, issues);
  const graph = verifyOFDPackageReferences(entries, xmlEntries, issues);
  verifyOFDPackageIds(xmlEntries, graph.documentPath, issues);
  const result: OFDPackageVerificationResult = Object.freeze({
    valid: issues.length === 0,
    entryPaths: Object.freeze([...entries.keys()]),
    issues: Object.freeze([...issues])
  });
  if (options.strict && !result.valid) {
    throw new OFDPackageVerificationError(result);
  }
  return result;
}

/**
 * Verifies an OFD package and throws when any structural issue is present.
 *
 * @param bytes - Complete ZIP-encoded OFD package bytes.
 * @param options - Optional archive limits; strict mode is always enabled.
 * @returns Immutable valid verification result.
 * @throws OFDPackageVerificationError when the package is invalid.
 */
export function assertOFDPackage(
  bytes: Uint8Array,
  options: Omit<OFDPackageVerificationOptions, "strict"> = {}
): OFDPackageVerificationResult {
  return verifyOFDPackage(bytes, { ...options, strict: true });
}

/**
 * Requires one package entry before XML graph traversal begins.
 *
 * @param entries - Safe unpacked package entries.
 * @param path - Required package entry path.
 * @param issues - Mutable issue sink.
 */
function requirePackageEntry(
  entries: ReadonlyMap<string, Uint8Array>,
  path: string,
  issues: OFDPackageVerificationIssue[]
): void {
  if (!entries.has(path)) {
    issues.push({
      code: "required-entry-missing",
      message: `OFD package is missing required entry "${path}".`,
      entryPath: path
    });
  }
}
