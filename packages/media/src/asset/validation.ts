import { QuireMediaAssetValidationError } from "./errors";
import { createQuireAssetMediaReference } from "./references";
import type {
  QuireMediaAssetInput,
  QuireMediaIntrinsicSize,
  QuireResolvedMediaAsset
} from "./types";

/** Normalized complete asset held only inside a repository. */
export interface NormalizedQuireMediaAsset {
  /** Stable host-defined asset identifier. */
  readonly assetId: string;
  /** Validated media family. */
  readonly kind: "image";
  /** Validated MIME media type. */
  readonly mimeType: string;
  /** Repository-owned portable bytes. */
  readonly bytes: Uint8Array;
  /** Optional validated file name. */
  readonly fileName?: string | undefined;
  /** Optional validated intrinsic dimensions. */
  readonly intrinsicSize?: QuireMediaIntrinsicSize | undefined;
}

/**
 * Validates and defensively copies one complete repository input.
 *
 * @param input - Candidate portable asset.
 * @returns A normalized repository-owned asset.
 */
export function normalizeQuireMediaAssetInput(
  input: QuireMediaAssetInput
): NormalizedQuireMediaAsset {
  const reference = createQuireAssetMediaReference(input.assetId);
  if (input.kind !== "image") {
    throw new QuireMediaAssetValidationError(
      "invalid-kind",
      `Unsupported media asset kind: ${String(input.kind)}.`
    );
  }
  assertImageMimeType(input.mimeType);
  const bytes = copyPortableBytes(input.bytes);
  if (bytes.byteLength === 0) {
    throw new QuireMediaAssetValidationError(
      "empty-data",
      "Media asset bytes must not be empty."
    );
  }
  assertOptionalFileName(input.fileName);
  const intrinsicSize = normalizeIntrinsicSize(input.intrinsicSize);
  return {
    assetId: reference.assetId,
    kind: input.kind,
    mimeType: input.mimeType,
    bytes,
    ...(input.fileName === undefined ? {} : { fileName: input.fileName }),
    ...(intrinsicSize === undefined ? {} : { intrinsicSize })
  };
}

/**
 * Creates a caller-owned resolution from one repository-owned asset.
 *
 * @param asset - Normalized asset held by a repository.
 * @returns A resolved asset with fresh bytes and metadata.
 */
export function cloneQuireResolvedMediaAsset(
  asset: NormalizedQuireMediaAsset
): QuireResolvedMediaAsset {
  return {
    reference: createQuireAssetMediaReference(asset.assetId),
    kind: asset.kind,
    mimeType: asset.mimeType,
    bytes: asset.bytes.slice(),
    ...(asset.fileName === undefined ? {} : { fileName: asset.fileName }),
    ...(asset.intrinsicSize === undefined
      ? {}
      : { intrinsicSize: { ...asset.intrinsicSize } })
  };
}

/**
 * Copies supported portable byte containers without retaining an alias.
 *
 * @param bytes - Candidate ArrayBuffer or Uint8Array.
 * @returns A fresh Uint8Array containing the exact candidate range.
 */
function copyPortableBytes(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  if (bytes instanceof Uint8Array) {
    return bytes.slice();
  }
  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes.slice(0));
  }
  throw new QuireMediaAssetValidationError(
    "empty-data",
    "Media asset bytes must be an ArrayBuffer or Uint8Array."
  );
}

/**
 * Requires the first admitted media family and a syntactically valid MIME type.
 *
 * @param mimeType - Candidate media type.
 */
function assertImageMimeType(mimeType: string): void {
  const mimePattern =
    /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
  if (
    mimeType.trim() !== mimeType ||
    !mimePattern.test(mimeType) ||
    !mimeType.toLowerCase().startsWith("image/")
  ) {
    throw new QuireMediaAssetValidationError(
      "invalid-mime-type",
      `Expected a syntactically valid image MIME type, received "${mimeType}".`
    );
  }
}

/**
 * Validates one optional producer-visible file name.
 *
 * @param fileName - Candidate file name.
 */
function assertOptionalFileName(fileName: string | undefined): void {
  if (
    fileName !== undefined &&
    (fileName.length === 0 || fileName.trim() !== fileName)
  ) {
    throw new QuireMediaAssetValidationError(
      "invalid-file-name",
      "Media asset file name must be a non-empty canonical string."
    );
  }
}

/**
 * Validates and copies optional intrinsic raster dimensions.
 *
 * @param size - Candidate source-pixel dimensions.
 * @returns A fresh validated size, or undefined when absent.
 */
function normalizeIntrinsicSize(
  size: QuireMediaIntrinsicSize | undefined
): QuireMediaIntrinsicSize | undefined {
  if (size === undefined) {
    return undefined;
  }
  if (
    !Number.isFinite(size.width) ||
    size.width <= 0 ||
    !Number.isFinite(size.height) ||
    size.height <= 0
  ) {
    throw new QuireMediaAssetValidationError(
      "invalid-intrinsic-size",
      "Media intrinsic width and height must be positive finite values."
    );
  }
  return { width: size.width, height: size.height };
}
