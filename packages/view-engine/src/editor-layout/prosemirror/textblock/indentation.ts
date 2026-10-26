import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import { parseQuireFontPixelSize } from "@quirekit/layout/shaping";
import type { QuireCharacterGrid, QuireTextLineSlot } from "@quirekit/renderer";
import { quireNeutralDocumentProfile } from "../../../document-profile/defaults";
import type { QuireParagraphModelProfile } from "../../../document-profile/types";

const minimumTextWidth = 1;
/** One character pitch for the default 16px (12pt) paragraph font. */
export const quireDefaultCharacterPitch = 16;

/** Physical paragraph geometry projected into textblock-local CSS pixels. */
export interface QuireTextblockIndentationGeometry {
  /** Physical x of following lines relative to the section body start. */
  readonly x: number;
  /** Physical width available to following lines. */
  readonly width: number;
  /** Physical x of the first line relative to the section body start. */
  readonly firstLineX: number;
  /** Physical width available to the first line. */
  readonly firstLineWidth: number;
  /** Stable geometry suffix used by retained shape identities. */
  readonly signature: string;
}

/** Input used to combine paragraph indentation with flow-exclusion slots. */
export interface ResolveQuireTextblockLineSlotsOptions {
  /** Resolved physical paragraph geometry. */
  readonly geometry: QuireTextblockIndentationGeometry;
  /** Optional full-body slots contributed by floating-object flow exclusion. */
  readonly flowSlots?: readonly (readonly QuireTextLineSlot[])[] | undefined;
}

/** Optional effective formatting supplied by a higher-level paragraph model. */
export interface ResolveQuireTextblockIndentationGeometryOptions {
  /** Effective indentation token after direct formatting and inherited defaults merge. */
  readonly indentation?: unknown;
  /** Effective paragraph character pitch in CSS pixels used by relative values. */
  readonly characterPitch?: number | undefined;
  /** Container constraint consumed by the document model for relative indentation. */
  readonly characterGrid?: QuireCharacterGrid | null | undefined;
  /** Whether the first-line hanging interval is reserved for a generated marker. */
  readonly reserveFirstLineForMarker?: boolean | undefined;
  /** Paragraph semantics resolving indentation; defaults to the neutral model. */
  readonly paragraphModel?: QuireParagraphModelProfile | undefined;
}

/**
 * Resolves the relative indentation pitch from effective paragraph typography.
 *
 * Character-relative indentation follows paragraph typography rather than one
 * product-wide constant. Uniform direct formatting across every text run
 * establishes the paragraph pitch. Mixed inline sizes deliberately fall back
 * to the node-level font so one enlarged word cannot move the paragraph body
 * or invalidate wrapping.
 *
 * @param font - Node-level effective paragraph CSS font shorthand.
 * @param runs - Mark-resolved inline runs owned by the paragraph.
 * @returns One character pitch in CSS pixels.
 */
export function resolveQuireTextblockCharacterPitch(
  font: string,
  runs: readonly Pick<QuireInlineTextRun, "font">[] = []
): number {
  const paragraphFontSize = parseValidFontSize(font);
  const paragraphPitch = paragraphFontSize ?? quireDefaultCharacterPitch;
  let uniformRunFontSize: number | undefined;

  for (const run of runs) {
    const runFontSize = parseValidFontSize(run.font);
    if (runFontSize === null) return paragraphPitch;
    if (uniformRunFontSize === undefined) {
      uniformRunFontSize = runFontSize;
      continue;
    }
    if (Math.abs(uniformRunFontSize - runFontSize) > Number.EPSILON) {
      return paragraphPitch;
    }
  }

  return uniformRunFontSize === undefined ? paragraphPitch : uniformRunFontSize;
}

/**
 * Resolves paragraph indentation into physical textblock geometry.
 *
 * The retained model is logical: start/end swap physical sides under RTL,
 * while a positive first-line value always moves the first line farther from
 * logical start. Imported negative values remain valid hanging indents.
 *
 * @param node - Paragraph-like source node.
 * @param bodyWidth - Full active section-body width in CSS pixels.
 * @param baseDirection - Resolved paragraph base direction.
 * @param options - Optional inherited indentation and list-marker reservation.
 * @returns Safe physical geometry for first and following lines.
 */
export function resolveQuireTextblockIndentationGeometry(
  node: ProseMirrorNode,
  bodyWidth: number,
  baseDirection: "ltr" | "rtl" | "auto",
  options: ResolveQuireTextblockIndentationGeometryOptions = {}
): QuireTextblockIndentationGeometry {
  const model = options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  const indentation = model.resolveIndentation(
    options.indentation ?? model.nodeIndentation(node),
    options.characterPitch ?? quireDefaultCharacterPitch,
    options.characterGrid
  );
  const rtl = baseDirection === "rtl";
  const rawLeft = rtl ? indentation.end : indentation.start;
  const rawRight = rtl ? indentation.start : indentation.end;
  const left = clampPhysicalInset(rawLeft, bodyWidth);
  const maximumRight = bodyWidth - left - minimumTextWidth;
  const right = Math.min(clampPhysicalInset(rawRight, bodyWidth), maximumRight);
  const followingRight = bodyWidth - right;
  const width = Math.max(minimumTextWidth, followingRight - left);
  const firstLineDelta = options.reserveFirstLineForMarker === true ? 0 : indentation.firstLine;
  const rawFirstLineX = rtl ? left : left + firstLineDelta;
  const rawFirstLineRight = rtl
    ? followingRight - firstLineDelta
    : followingRight;
  const firstLineX = Math.min(
    rawFirstLineX,
    rawFirstLineRight - minimumTextWidth
  );
  const firstLineWidth = Math.max(
    minimumTextWidth,
    rawFirstLineRight - firstLineX
  );

  return {
    x: left,
    width,
    firstLineX,
    firstLineWidth,
    signature: [left, width, firstLineX, firstLineWidth]
      .map((value) => value.toFixed(4))
      .join(":")
  };
}

/**
 * Combines paragraph first/following-line bounds with flow-exclusion slots.
 *
 * Flow exclusion is expressed in full section-body coordinates. Inline text
 * layout uses following-line-local coordinates, so every declared row is
 * clipped to its paragraph interval and translated through the same origin.
 * Rows after the supplied array fall back to the following-line rectangle.
 *
 * @param options - Paragraph geometry and optional full-body flow slots.
 * @returns Leading row slots, or undefined when the fixed rectangle suffices.
 */
export function resolveQuireTextblockLineSlots(
  options: ResolveQuireTextblockLineSlotsOptions
): readonly (readonly QuireTextLineSlot[])[] | undefined {
  const { geometry, flowSlots } = options;
  const hasFirstLineDifference = geometry.firstLineX !== geometry.x
    || geometry.firstLineWidth !== geometry.width;
  if (flowSlots === undefined && !hasFirstLineDifference) return undefined;
  if (flowSlots === undefined) {
    return [[{
      x: geometry.firstLineX - geometry.x,
      width: geometry.firstLineWidth
    }]];
  }

  const rowCount = Math.max(flowSlots.length, 1);
  const rows: QuireTextLineSlot[][] = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const paragraphX = rowIndex === 0 ? geometry.firstLineX : geometry.x;
    const paragraphWidth = rowIndex === 0
      ? geometry.firstLineWidth
      : geometry.width;
    const available = flowSlots[rowIndex] ?? [{
      x: geometry.x,
      width: geometry.width
    }];
    rows.push(intersectLineSlots(
      available,
      paragraphX,
      paragraphWidth,
      geometry.x
    ));
  }
  return rows;
}

/**
 * Clamps hostile imported insets without erasing valid negative indentation.
 *
 * @param value - Physical inset in CSS pixels.
 * @param bodyWidth - Full text body width.
 * @returns Finite inset bounded to one body width in either direction.
 */
function clampPhysicalInset(value: number, bodyWidth: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-bodyWidth, Math.min(bodyWidth, value));
}

/**
 * Parses one positive CSS pixel font size.
 *
 * @param font - CSS font shorthand to inspect.
 * @returns Positive pixel size, or null when the shorthand is unsupported.
 */
function parseValidFontSize(font: string): number | null {
  const fontSize = parseQuireFontPixelSize(font);
  return fontSize === null || !Number.isFinite(fontSize) || fontSize <= 0
    ? null
    : fontSize;
}

/**
 * Intersects full-body slots with one paragraph row interval.
 *
 * @param slots - Physical full-body slots in left-to-right order.
 * @param paragraphX - Physical paragraph-row start.
 * @param paragraphWidth - Physical paragraph-row width.
 * @param localOrigin - Following-line origin used by inline layout.
 * @returns Positive-width slots translated into inline-layout coordinates.
 */
function intersectLineSlots(
  slots: readonly QuireTextLineSlot[],
  paragraphX: number,
  paragraphWidth: number,
  localOrigin: number
): QuireTextLineSlot[] {
  const paragraphRight = paragraphX + paragraphWidth;
  const output: QuireTextLineSlot[] = [];
  for (const slot of slots) {
    const left = Math.max(slot.x, paragraphX);
    const right = Math.min(slot.x + slot.width, paragraphRight);
    if (right <= left) continue;
    output.push({ x: left - localOrigin, width: right - left });
  }
  return output;
}
