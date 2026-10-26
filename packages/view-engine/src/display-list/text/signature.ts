import {
  readQuireTextFragmentSource,
  type QuireTextFragment
} from "@quirekit/layout/text";

/** Command inputs that participate in text-fragment command reuse. */
interface TextFragmentCommandSignatureKey {
  /** Layout node id that owns the generated text command. */
  readonly nodeId: string;
  /** Fragment index within the owning layout node. */
  readonly fragmentIndex: number;
  /** Default fill style used when the fragment has no mark color. */
  readonly defaultFillStyle: string;
}

/** Cached shifted signature for a retained text fragment object. */
interface TextFragmentCommandShiftSignatureCacheEntry {
  /** Layout node id captured when the signature was generated. */
  readonly nodeId: string;
  /** Default fill style captured when the signature was generated. */
  readonly defaultFillStyle: string;
  /** Compact shifted signature for the fragment and key. */
  readonly signature: string;
}

const signatureFieldSeparator = "\u001f";
const signatureItemSeparator = "\u001e";
const fragmentShiftSignatureCache =
  new WeakMap<QuireTextFragment, TextFragmentCommandShiftSignatureCacheEntry>();
const shapedRunSignatureCache =
  new WeakMap<NonNullable<QuireTextFragment["shapedRun"]>, string>();

/**
 * Creates a command-reuse signature for a text fragment whose document range may
 * have shifted while paint geometry stayed the same.
 *
 * @param fragment - Text fragment whose generated commands may be reused.
 * @param key - Command inputs supplied by the display-list builder.
 * @returns Stable value signature for range-shifted command reuse.
 */
export function createTextFragmentCommandShiftSignature(
  fragment: QuireTextFragment,
  key: TextFragmentCommandSignatureKey
): string {
  return createTextFragmentCommandShiftSignatureByKeyParts(
    fragment,
    key.nodeId,
    key.defaultFillStyle
  );
}

/**
 * Creates a range-shifted command signature from primitive key parts.
 *
 * @param fragment - Text fragment whose generated commands may be reused.
 * @param nodeId - Layout node id that owns the generated text command.
 * @param defaultFillStyle - Default fill style used when the fragment has no mark color.
 * @returns Stable value signature for range-shifted command reuse.
 */
export function createTextFragmentCommandShiftSignatureByKeyParts(
  fragment: QuireTextFragment,
  nodeId: string,
  defaultFillStyle: string
): string {
  const cached = fragmentShiftSignatureCache.get(fragment);

  if (
    cached &&
    cached.nodeId === nodeId &&
    cached.defaultFillStyle === defaultFillStyle
  ) {
    return cached.signature;
  }

  const sourceSignature = readForwardedTextFragmentCommandShiftSignature(
    fragment,
    nodeId,
    defaultFillStyle
  );
  if (sourceSignature !== undefined) {
    return sourceSignature;
  }

  const signature = createTextFragmentCommandShiftSignatureValue(
    fragment,
    nodeId,
    defaultFillStyle
  );

  fragmentShiftSignatureCache.set(fragment, {
    nodeId,
    defaultFillStyle,
    signature
  });

  return signature;
}

/**
 * Reuses a retained source fragment's materialized shifted signature.
 *
 * @param fragment - Shifted fragment whose source metadata may be known.
 * @param nodeId - Layout node id that owns the generated text command.
 * @param defaultFillStyle - Default fill style used when the fragment has no mark color.
 * @returns Forwarded shifted signature, or undefined when it is not available.
 */
function readForwardedTextFragmentCommandShiftSignature(
  fragment: QuireTextFragment,
  nodeId: string,
  defaultFillStyle: string
): string | undefined {
  const source = readQuireTextFragmentSource(fragment);
  if (source === undefined) {
    return undefined;
  }

  const cached = fragmentShiftSignatureCache.get(source);
  if (
    cached === undefined ||
    cached.nodeId !== nodeId ||
    cached.defaultFillStyle !== defaultFillStyle
  ) {
    return undefined;
  }

  fragmentShiftSignatureCache.set(fragment, cached);

  return cached.signature;
}

/**
 * Creates the compact shifted command signature without intermediate key objects.
 *
 * @param fragment - Text fragment whose generated commands may be reused.
 * @param key - Command inputs supplied by the display-list builder.
 * @returns Stable shifted value signature for command reuse.
 */
function createTextFragmentCommandShiftSignatureValue(
  fragment: QuireTextFragment,
  nodeId: string,
  defaultFillStyle: string
): string {
  let signature = encodeSignatureField("shift");
  signature = appendSignatureField(signature, nodeId);
  signature = appendSignatureField(signature, defaultFillStyle);
  signature = appendSignatureField(signature, fragment.text);
  signature = appendSignatureField(signature, fragment.tab?.text ?? null);
  signature = appendSignatureField(signature, fragment.tab?.offset ?? null);
  signature = appendSignatureField(
    signature,
    fragment.range.to - fragment.range.from
  );
  signature = appendSignatureField(signature, fragment.rect.width);
  signature = appendSignatureField(signature, fragment.rect.height);
  signature = appendSignatureField(signature, fragment.font);
  signature = appendSignatureField(signature, fragment.letterSpacing ?? null);
  signature = appendSignatureField(signature, fragment.horizontalScale ?? null);
  signature = appendSignatureField(signature, fragment.trailingSpacing ?? null);
  signature = appendSignatureField(signature, fragment.paintOffset ?? null);
  signature = appendSignatureField(signature, fragment.textColor ?? null);
  signature = appendSignatureField(
    signature,
    fragment.textBackgroundColor ?? null
  );
  signature = appendSignatureField(
    signature,
    encodeStringArray(fragment.textDecoration ?? [])
  );
  signature = appendSignatureField(signature, fragment.underline?.style ?? null);
  signature = appendSignatureField(signature, fragment.underline?.color ?? null);
  signature = appendSignatureField(signature, fragment.emphasisMark ?? null);
  signature = appendSignatureField(
    signature,
    encodeStringArray(fragment.glyphEffects ?? [])
  );
  signature = appendSignatureField(signature, fragment.hiddenText ?? null);
  signature = appendSignatureField(
    signature,
    encodeStringArray(fragment.marks ?? [])
  );
  signature = appendSignatureField(signature, fragment.lineHeight);
  signature = appendSignatureField(signature, fragment.clipToLine === true);
  signature = appendSignatureField(signature, fragment.baseline - fragment.rect.y);
  signature = appendSignatureField(signature, fragment.runAscent ?? null);
  signature = appendSignatureField(signature, fragment.runDescent ?? null);
  signature = appendSignatureField(signature, fragment.direction ?? "ltr");

  return appendSignatureField(
    signature,
    encodeShapedRunSignature(fragment.shapedRun)
  );
}

/** Scalar values accepted by compact signature serialization. */
type SignatureField = string | number | boolean | null;

/**
 * Encodes a shaped run into a compact value signature.
 *
 * @param shapedRun - Optional shaped run carried by a text fragment.
 * @returns Stable shaped-run signature field.
 */
function encodeShapedRunSignature(
  shapedRun: QuireTextFragment["shapedRun"]
): string {
  if (shapedRun === undefined) {
    return "none";
  }

  const cached = shapedRunSignatureCache.get(shapedRun);

  if (cached !== undefined) {
    return cached;
  }

  const signature = joinSignatureFields([
    shapedRun.width,
    shapedRun.ascent,
    shapedRun.descent,
    shapedRun.glyphCoverage ?? null,
    shapedRun.clusters
      .map((cluster) => joinSignatureFields([
        cluster.from,
        cluster.to,
        cluster.x,
        cluster.advance,
        cluster.rtl
      ]))
      .join(signatureItemSeparator),
    (shapedRun.glyphs ?? [])
      .map((glyph) => joinSignatureFields([
        glyph.glyphId,
        glyph.sourceCluster,
        glyph.x,
        glyph.y,
        glyph.xAdvance,
        glyph.yAdvance,
        glyph.xOffset,
        glyph.yOffset,
        glyph.fontId ?? null,
        glyph.fontFamily ?? null
      ]))
      .join(signatureItemSeparator)
  ]);

  shapedRunSignatureCache.set(shapedRun, signature);

  return signature;
}

/**
 * Encodes string arrays into one compact signature field.
 *
 * @param values - String values to encode.
 * @returns Stable array signature field.
 */
function encodeStringArray(values: readonly string[]): string {
  if (values.length === 0) {
    return "";
  }

  let encoded = encodeSignatureField(values[0]!);
  for (let index = 1; index < values.length; index += 1) {
    encoded += signatureItemSeparator + encodeSignatureField(values[index]!);
  }

  return encoded;
}

/**
 * Joins signature fields with length-prefixed strings.
 *
 * @param fields - Fields to join.
 * @returns Compact collision-resistant signature string.
 */
function joinSignatureFields(fields: readonly SignatureField[]): string {
  if (fields.length === 0) {
    return "";
  }

  let signature = encodeSignatureField(fields[0]!);
  for (let index = 1; index < fields.length; index += 1) {
    signature += signatureFieldSeparator + encodeSignatureField(fields[index]!);
  }

  return signature;
}

/**
 * Appends one encoded signature field without allocating an intermediate array.
 *
 * @param signature - Existing encoded signature prefix.
 * @param field - Next scalar field to append.
 * @returns Signature with the new field appended.
 */
function appendSignatureField(
  signature: string,
  field: SignatureField
): string {
  return `${signature}${signatureFieldSeparator}${encodeSignatureField(field)}`;
}

/**
 * Encodes one scalar value for compact signature joining.
 *
 * @param field - Scalar value to encode.
 * @returns Encoded signature field.
 */
function encodeSignatureField(field: SignatureField): string {
  if (field === null) {
    return "n";
  }

  if (typeof field === "string") {
    return `s${field.length}:${field}`;
  }

  if (typeof field === "boolean") {
    return field ? "b1" : "b0";
  }

  return `d${field}`;
}
