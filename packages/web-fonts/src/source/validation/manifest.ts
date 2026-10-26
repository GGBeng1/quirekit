import type {
  QuireWebFontAsset,
  QuireWebFontFace,
  QuireWebFontFamilyManifest
} from "../../types";
import type {
  QuireFontSourceDescriptor
} from "../types";
import {
  definedEntries,
  optionalNonNegativeInteger,
  optionalString,
  parseLicense,
  requireExactVersion,
  requireHttpsUrl,
  requireMatchingString,
  requireRecord,
  requireString
} from "./shared";

const INTEGRITY_PATTERN = /^sha256-[A-Za-z0-9+/]+={0,2}$/u;

/**
 * Validates one declarative manifest with strict community-source asset facts.
 *
 * @param value - Unknown JSON response.
 * @param descriptor - Owning source descriptor.
 * @param expectedFamilyId - Requested stable family identity.
 * @param expectedVersion - Requested exact version.
 * @returns Validated installable manifest.
 */
export function parseQuireRemoteFontFamilyManifest(
  value: unknown,
  descriptor: QuireFontSourceDescriptor,
  expectedFamilyId: string,
  expectedVersion: string
): QuireWebFontFamilyManifest {
  const record = requireRecord(value, "font family manifest");
  const providerId = requireString(record.providerId, "provider id");
  const familyId = requireString(record.familyId, "family id");
  const version = requireExactVersion(record.version, "font version");
  if (providerId !== descriptor.id || familyId !== expectedFamilyId || version !== expectedVersion) {
    throw new TypeError("Font manifest identity does not match the requested source family.");
  }
  if (!Array.isArray(record.faces) || record.faces.length === 0 || record.faces.length > 32) {
    throw new TypeError("Font manifest must contain between 1 and 32 faces.");
  }
  const genericFamily = optionalString(record.genericFamily, "generic family");
  return Object.freeze({
    providerId,
    familyId,
    family: requireString(record.family, "CSS family"),
    version,
    license: parseLicense(record.license),
    ...(genericFamily === undefined ? {} : { genericFamily }),
    faces: Object.freeze(record.faces.map((face, index) => parseFace(face, index)))
  });
}

/**
 * Parses one strict remote face.
 *
 * @param value - Unknown face value.
 * @param index - Zero-based face index for diagnostics.
 * @returns Valid immutable face.
 */
function parseFace(value: unknown, index: number): QuireWebFontFace {
  const record = requireRecord(value, `face ${index}`);
  if (!Array.isArray(record.assets) || record.assets.length === 0 || record.assets.length > 256) {
    throw new TypeError(`Face ${index} must contain between 1 and 256 assets.`);
  }
  const descriptors = {
    style: optionalString(record.style, "face style"),
    weight: optionalString(record.weight, "face weight"),
    stretch: optionalString(record.stretch, "face stretch")
  };
  return Object.freeze({
    id: requireString(record.id, "face id"),
    ...definedEntries(descriptors),
    assets: Object.freeze(record.assets.map((asset, assetIndex) => (
      parseAsset(asset, index, assetIndex)
    )))
  });
}

/**
 * Parses one strict remote asset.
 *
 * @param value - Unknown asset value.
 * @param faceIndex - Zero-based owning face index.
 * @param assetIndex - Zero-based asset index.
 * @returns Valid immutable asset.
 */
function parseAsset(value: unknown, faceIndex: number, assetIndex: number): QuireWebFontAsset {
  const record = requireRecord(value, `face ${faceIndex} asset ${assetIndex}`);
  if (!Array.isArray(record.sources) || record.sources.length === 0 || record.sources.length > 4) {
    throw new TypeError("Remote font asset must contain between 1 and 4 mirrors.");
  }
  const sizeBytes = optionalNonNegativeInteger(record.sizeBytes, "asset size");
  if (sizeBytes === undefined || sizeBytes === 0) {
    throw new TypeError("Remote font asset requires a positive sizeBytes value.");
  }
  const integrity = requireMatchingString(record.integrity, "asset integrity", INTEGRITY_PATTERN);
  const unicodeRange = optionalString(record.unicodeRange, "Unicode range");
  return Object.freeze({
    id: requireString(record.id, "asset id"),
    sources: Object.freeze(record.sources.map((source) => {
      const sourceRecord = requireRecord(source, "asset source");
      const format = requireString(sourceRecord.format, "asset format");
      if (!["woff2", "woff", "truetype", "opentype"].includes(format)) {
        throw new TypeError(`Unsupported remote font format "${format}".`);
      }
      return Object.freeze({
        url: requireHttpsUrl(sourceRecord.url, undefined, "asset URL"),
        format: format as QuireWebFontAsset["sources"][number]["format"]
      });
    })),
    sizeBytes,
    integrity,
    ...(unicodeRange === undefined ? {} : { unicodeRange })
  });
}
