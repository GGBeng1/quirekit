import type { EmphasisMarkTarget } from "./types";
import { createCircleSegments, createCommaSegments } from "./paths";
import { findFragmentLocalX } from "../fragment/segment";
import type {
  QuireDisplayCommand,
  QuireDocumentRange,
  QuirePathCommand
} from "@quirekit/renderer";
import {
  segmentQuireTextGraphemes,
  type QuireTextFragment
} from "@quirekit/layout/text";
import { parseQuireFontPixelSize } from "@quirekit/layout/shaping";

/**
 * Appends East-Asian emphasis marks for one painted text segment.
 *
 * Marks consume the fragment's caret/cluster-derived geometry and never
 * participate in horizontal measurement. Whitespace and zero-width graphemes
 * are deliberately skipped.
 *
 * @param commands - Mutable display command list.
 * @param commandId - Stable id prefix for the owning text segment.
 * @param fragment - Parent fragment carrying emphasis style and caret stops.
 * @param range - Painted document range within the fragment.
 * @param color - Resolved glyph color shared by the emphasis marks.
 * @returns Nothing.
 */
export function appendTextEmphasisMarkCommands(
  commands: QuireDisplayCommand[],
  commandId: string,
  fragment: QuireTextFragment,
  range: QuireDocumentRange,
  color: string
): void {
  const kind = fragment.emphasisMark;
  if (kind === undefined) return;
  const fontSize = parseQuireFontPixelSize(fragment.font) ?? 16;
  const radius = Math.min(2.5, Math.max(1.1, fontSize * 0.075));
  const centerY = resolveEmphasisMarkCenterY(fragment, kind, radius, fontSize);
  const targets = collectEmphasisMarkTargets(fragment, range);

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]!;
    commands.push(createEmphasisMarkCommand(
      `${commandId}:emphasis-mark-${index}`,
      target,
      centerY,
      radius,
      kind,
      color
    ));
  }
}

/**
 * Collects non-whitespace grapheme centers from fragment caret geometry.
 *
 * @param fragment - Fragment whose logical graphemes and visual stops are read.
 * @param range - Painted subrange to include.
 * @returns Emphasis targets in logical grapheme order.
 */
function collectEmphasisMarkTargets(
  fragment: QuireTextFragment,
  range: QuireDocumentRange
): readonly EmphasisMarkTarget[] {
  const targets: EmphasisMarkTarget[] = [];
  let offset = 0;
  for (const grapheme of segmentQuireTextGraphemes(fragment.text)) {
    const from = fragment.range.from + offset;
    const to = from + grapheme.length;
    offset += grapheme.length;
    if (from < range.from || to > range.to || /^\s+$/u.test(grapheme)) continue;
    const start = findFragmentLocalX(fragment, from);
    const end = findFragmentLocalX(fragment, to);
    if (Math.abs(end - start) <= 0.001) continue;
    targets.push({
      range: { from, to },
      centerX: fragment.rect.x + (start + end) / 2
    });
  }
  return targets;
}

/**
 * Resolves the marker center on the over or under side of the glyph run.
 *
 * @param fragment - Fragment carrying baseline and optional run metrics.
 * @param kind - Visible emphasis-mark kind.
 * @param radius - Marker radius in layout coordinates.
 * @param fontSize - Parsed font size fallback.
 * @returns Absolute marker-center y coordinate.
 */
function resolveEmphasisMarkCenterY(
  fragment: QuireTextFragment,
  kind: NonNullable<QuireTextFragment["emphasisMark"]>,
  radius: number,
  fontSize: number
): number {
  if (kind === "underDot") {
    const descent = fragment.runDescent ?? fontSize * 0.42;
    return fragment.baseline + descent - radius;
  }
  const ascent = fragment.runAscent ?? fontSize * 1.02;
  return fragment.baseline - ascent + radius;
}

/**
 * Creates one backend-neutral emphasis-mark path.
 *
 * @param id - Stable display-command id.
 * @param target - Grapheme range and horizontal center.
 * @param centerY - Marker center y coordinate.
 * @param radius - Marker radius.
 * @param kind - Visible emphasis-mark kind.
 * @param color - Fill or stroke color.
 * @returns Filled or stroked path command.
 */
function createEmphasisMarkCommand(
  id: string,
  target: EmphasisMarkTarget,
  centerY: number,
  radius: number,
  kind: NonNullable<QuireTextFragment["emphasisMark"]>,
  color: string
): QuirePathCommand {
  const height = radius * (kind === "comma" ? 2.7 : 2);
  const segments = kind === "comma"
    ? createCommaSegments(target.centerX, centerY, radius)
    : createCircleSegments(target.centerX, centerY, radius);
  return {
    id,
    kind: "path",
    layer: "content",
    range: target.range,
    rect: {
      x: target.centerX - radius,
      y: centerY - radius,
      width: radius * 2,
      height
    },
    segments,
    ...(kind === "circle"
      ? { strokeStyle: color, lineWidth: Math.max(0.75, radius * 0.5) }
      : { fillStyle: color })
  };
}
