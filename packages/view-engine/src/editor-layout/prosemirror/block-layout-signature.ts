import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireBlockLayoutInput } from "../../layout/engine/block-types";
import { createQuireInlineSourceCapabilitySignature } from "../../layout/engine/inline/source-capability";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireProseMirrorBlockInputOptions } from "./block";
import { resolveQuireTextblockMeasurementCacheVariant } from "./textblock/document-grid";
import { quireNeutralDocumentProfile } from "../../document-profile/defaults";

/** Last variant per immutable textblock, valid only under the same context key. */
const variantMemo = new WeakMap<ProseMirrorNode, { readonly key: object; readonly variant: string }>();

/** Interned context keys; equal contexts across frames share one key object. */
const variantContextKeys = new Map<string, object>();

/** Context keys resolved for one collection's options object. */
const variantContextKeysByOptions = new WeakMap<QuireProseMirrorBlockInputOptions, object>();

/** Interned style signatures; equal signature strings share one short identity. */
const signatureIds = new Map<string, string>();

/** Stable numeric identities for context objects that have no signature. */
const contextObjectIds = new WeakMap<object, number>();
let nextContextObjectId = 1;

/** Interned context keys retained across frames. */
const maxVariantContextKeys = 256;

/**
 * Resolves the measurement cache identity for one paragraph context.
 *
 * The variant is a pure function of the node and the paragraph context: the
 * model, its style signature (the contract's stable style identity), the table
 * style layer, line grid, table-cell flag, wrap policy and hidden-text mode. It is memoized
 * per immutable node so unchanged paragraphs skip style resolution each frame.
 *
 * @param node - Candidate textblock.
 * @param options - Active section and table measurement context.
 * @returns Exact section-grid variant or the default identity.
 */
export function resolveTextblockMeasurementCacheVariant(
  node: ProseMirrorNode,
  options: QuireProseMirrorBlockInputOptions
): string {
  const key = readVariantContextKey(options);
  const memo = variantMemo.get(node);
  if (memo?.key === key) return memo.variant;
  const variant = computeTextblockMeasurementCacheVariant(node, options);
  variantMemo.set(node, { key, variant });
  return variant;
}

/**
 * Reads the interned key of every context input the variant depends on.
 *
 * @param options - Active collection options.
 * @returns Key object shared by equal contexts.
 */
function readVariantContextKey(options: QuireProseMirrorBlockInputOptions): object {
  const cached = variantContextKeysByOptions.get(options);
  if (cached !== undefined) return cached;
  const model = options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  const context = options.paragraphStyleContext ?? model.styleContext(options.state.doc);
  const text = [
    readContextObjectId(model),
    // Style signatures can be long; intern them so the key stays short per paragraph.
    context.signature == null ? `token:${readContextObjectId(context.token)}` : readSignatureId(context.signature),
    context.justifySoftBreaks,
    readContextObjectId(options.wordTableCellStyleLayer),
    JSON.stringify(options.lineGrid ?? null),
    JSON.stringify(options.characterGrid ?? null),
    options.insideWordTableCell === true,
    options.lineBreakMode,
    options.hiddenTextViewMode ?? "normal"
  ].join("\u0000");
  let key = variantContextKeys.get(text);
  if (key === undefined) {
    if (variantContextKeys.size >= maxVariantContextKeys) {
      variantContextKeys.delete(variantContextKeys.keys().next().value!);
    }
    key = {};
    variantContextKeys.set(text, key);
  }
  variantContextKeysByOptions.set(options, key);
  return key;
}

/**
 * Reads a small interned identity for a style signature string.
 *
 * @param signature - Paragraph style context signature.
 * @returns Identity shared by equal signatures.
 */
function readSignatureId(signature: string): string {
  let id = signatureIds.get(signature);
  if (id === undefined) {
    if (signatureIds.size >= maxVariantContextKeys) signatureIds.delete(signatureIds.keys().next().value!);
    signatureIds.set(signature, id = `sig:${nextContextObjectId++}`);
  }
  return id;
}

/**
 * Reads a stable identity for an optional context object.
 *
 * @param value - Context object or primitive.
 * @returns Numeric identity, or 0 for absent and primitive values.
 */
function readContextObjectId(value: unknown): number {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return 0;
  let id = contextObjectIds.get(value);
  if (id === undefined) {
    id = nextContextObjectId;
    nextContextObjectId += 1;
    contextObjectIds.set(value, id);
  }
  return id;
}

/**
 * Computes the measurement cache identity without memoization.
 *
 * @param node - Candidate textblock.
 * @param options - Active section and table measurement context.
 * @returns Exact section-grid variant or the default identity.
 */
function computeTextblockMeasurementCacheVariant(
  node: ProseMirrorNode,
  options: QuireProseMirrorBlockInputOptions
): string {
  const model = options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  const context = options.paragraphStyleContext ?? model.styleContext(options.state.doc);
  const paragraphFormatting = model.resolveParagraph(node, context, options.wordTableCellStyleLayer);
  const measurementVariant = resolveQuireTextblockMeasurementCacheVariant(
    paragraphFormatting,
    options.lineGrid,
    options.insideWordTableCell,
    context.signature !== null
  );
  const nodeStyleVariant = model.styleTextSignature(node, context, options.wordTableCellStyleLayer);
  const compatibilityVariant = paragraphFormatting.alignment === "justify"
    ? `|justify-soft-breaks:${context.justifySoftBreaks}`
    : "";
  const wrapVariant = options.lineBreakMode === "word" ? "" : `|wrap:${options.lineBreakMode}`;
  const characterVariant = options.characterGrid ? `|character-grid:${JSON.stringify(options.characterGrid)}` : "";
  const styleAwareVariant = `${measurementVariant}${compatibilityVariant}|node-style:${nodeStyleVariant}${wrapVariant}${characterVariant}`;
  return (options.hiddenTextViewMode ?? "normal") === "normal"
    ? styleAwareVariant
    : `${styleAwareVariant}|hidden-text:formatting-inspection`;
}

/**
 * Creates a position-independent signature for an estimated block input.
 *
 * Cache identity must survive document shifts, so positions are normalized
 * against the textblock's content start before they enter the signature.
 *
 * @param lines - Estimated line count.
 * @param lineHeight - Estimated visual line height.
 * @param sourceAnchors - Logical non-text inline sources retained by the estimate.
 * @param sourceCapabilities - Claimed View capability sidecars retained by the estimate.
 * @param contentStart - Absolute position used to normalize source offsets.
 * @returns Stable layout signature for the estimate.
 */
export function createEstimatedBlockLayoutSignature(
  lines: number,
  lineHeight: number,
  sourceAnchors: NonNullable<QuireBlockLayoutInput["sourceAnchors"]>,
  sourceCapabilities: NonNullable<QuireBlockLayoutInput["sourceCapabilities"]>,
  contentStart: number
): string {
  return `estimated\u0000${lines}\u0000${lineHeight}${createInlineSourceAnchorLayoutSignature(
    sourceAnchors,
    sourceCapabilities,
    contentStart
  )}`;
}

/**
 * Creates a position-independent layout signature for local textblock fragments.
 *
 * @param fragments - Local text fragments produced by inline layout.
 * @param sourceAnchors - Logical non-text inline sources owned by the textblock.
 * @param sourceCapabilities - Claimed View capability sidecars owned by the textblock.
 * @param contentStart - Absolute position used to normalize source offsets.
 * @returns Stable layout signature, or undefined when no fragments were produced.
 */
export function createTextblockLayoutSignature(
  fragments: readonly QuireTextFragment[],
  sourceAnchors: NonNullable<QuireBlockLayoutInput["sourceAnchors"]>,
  sourceCapabilities: NonNullable<QuireBlockLayoutInput["sourceCapabilities"]>,
  contentStart: number
): string {
  let signature = "";

  for (let index = 0; index < fragments.length; index += 1) {
    if (index > 0) {
      signature += "\u0001";
    }
    signature += createTextFragmentLayoutSignature(fragments[index]!);
  }

  signature += createInlineSourceAnchorLayoutSignature(
    sourceAnchors,
    sourceCapabilities,
    contentStart
  );

  return signature;
}

/**
 * Creates the position-independent signature for logical inline sources.
 *
 * @param sourceAnchors - Logical source anchors to summarize.
 * @param sourceCapabilities - Claimed View capability sidecars keyed by anchor id.
 * @param contentStart - Absolute position used to normalize source offsets.
 * @returns Signature fragment appended to shaped and estimated block identities.
 */
function createInlineSourceAnchorLayoutSignature(
  sourceAnchors: NonNullable<QuireBlockLayoutInput["sourceAnchors"]>,
  sourceCapabilities: NonNullable<QuireBlockLayoutInput["sourceCapabilities"]>,
  contentStart: number
): string {
  let signature = "";
  const capabilityByAnchorId = new Map(
    sourceCapabilities.map((capability) => [capability.sourceAnchorId, capability])
  );

  for (const anchor of sourceAnchors) {
    signature += "\u0005";
    signature += [
      anchor.nodeType,
      anchor.range.from - contentStart,
      anchor.range.to - contentStart,
      anchor.position.pos - contentStart,
      anchor.position.bias ?? "",
      anchor.affinity,
      createQuireInlineSourceCapabilitySignature(capabilityByAnchorId.get(anchor.id))
    ].join("\u0003");
  }

  return signature;
}

/**
 * Creates a position-independent layout signature for one local text fragment.
 *
 * @param fragment - Local text fragment to summarize.
 * @returns Stable fragment signature for block-layout shifted reuse.
 */
function createTextFragmentLayoutSignature(fragment: QuireTextFragment): string {
  let caretStopSignature = "";

  for (let index = 0; index < fragment.caretStops.length; index += 1) {
    const stop = fragment.caretStops[index]!;
    if (index > 0) {
      caretStopSignature += "\u0004";
    }
    caretStopSignature += `${stop.position.pos - fragment.range.from}`;
    caretStopSignature += `\u0003${stop.position.bias ?? ""}`;
    caretStopSignature += `\u0003${stop.localX}`;
  }

  return [
    fragment.id,
    fragment.text,
    fragment.range.to - fragment.range.from,
    fragment.rect.x,
    fragment.rect.y,
    fragment.rect.width,
    fragment.rect.height,
    fragment.font,
    fragment.letterSpacing ?? "",
    fragment.horizontalScale ?? "",
    fragment.trailingSpacing ?? "",
    fragment.paintOffset ?? "",
    fragment.textColor ?? "",
    fragment.textBackgroundColor ?? "",
    (fragment.textDecoration ?? []).join("\u0002"),
    fragment.underline?.style ?? "", fragment.underline?.color ?? "",
    fragment.emphasisMark ?? "",
    (fragment.glyphEffects ?? []).join("\u0002"),
    fragment.hiddenText ?? "",
    (fragment.marks ?? []).join("\u0002"),
    fragment.lineHeight,
    fragment.clipToLine === true,
    fragment.baseline,
    fragment.direction ?? "",
    caretStopSignature
  ].join("\u0000");
}

/**
 * Resolves cache identity shared by one recursive block-collection pass.
 *
 * @param options - Active section and table measurement context.
 * @returns Stable collection-level cache variant.
 */
export function resolveBlockCollectionCacheVariant(
  options: QuireProseMirrorBlockInputOptions
): string {
  const contextVariant = options.insideWordTableCell === true
    ? `word-table-cell:${JSON.stringify(options.wordTableCellStyleLayer ?? null)}`
    : options.lineGrid === null
    || options.lineGrid === undefined
      ? "default"
      : `line-grid:${options.lineGrid.signature}`;
  const styleContext = options.paragraphStyleContext
    ?? (options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel).styleContext(options.state.doc);
  const gridVariant = options.characterGrid ? `${contextVariant}|character-grid:${JSON.stringify(options.characterGrid)}` : contextVariant;
  const styleVariant = styleContext.signature === null ? gridVariant : `${gridVariant}|${styleContext.signature}`;
  const tableStyleSignature = (options.tableStyleContext
    ?? (options.tableModel ?? quireNeutralDocumentProfile.tableModel).styleContext(options.state.doc)).blockSignature;
  const tableStyleVariant = tableStyleSignature === null ? styleVariant : `${styleVariant}|${tableStyleSignature}`;
  const wrapVariant = options.lineBreakMode === "word"
    ? tableStyleVariant : `${tableStyleVariant}|wrap:${options.lineBreakMode}`;
  const paragraphVariant = styleContext.justifySoftBreaks
    ? wrapVariant : `${wrapVariant}|justify-soft-breaks:false`;
  return (options.hiddenTextViewMode ?? "normal") === "normal"
    ? paragraphVariant
    : `${paragraphVariant}|hidden-text:formatting-inspection`;
}
