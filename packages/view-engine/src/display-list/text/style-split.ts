import { resolveMarkDecorationLines } from "./mark-decoration";
import type {
  QuireDisplayCommand,
  QuireDocumentRange,
  QuireFillRectCommand,
  QuireLineCommand
} from "@quirekit/renderer";
import type { QuireDecorationLine, QuireDecorationTextSpan } from "../../decorations";
import type { QuireLayoutNode } from "../../layout";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { resolveQuireTextFragmentRunRect } from "@quirekit/layout/text";
import {
  createFragmentCommandId,
  createTextFragmentCommand
} from "./fragment";
import { resolveFragmentSegment } from "./fragment/segment";
import {
  collectIntersectingTextSpans,
  resolveFragmentTextStyleBoundaries,
  resolveSegmentTextStyle
} from "./style-resolver";
import { appendTextDecorationCommands } from "./text-decoration";
import { appendTextEmphasisMarkCommands } from "./emphasis";
import { appendLegacyGlyphEffectCommands } from "./glyph-effect";

const emptyDecorationLines: readonly QuireDecorationLine[] = [];

/** Inputs used to append styled text fragment commands. */
export interface StyledTextFragmentCommandsOptions {
  /** Mutable display command list being built. */
  readonly commands: QuireDisplayCommand[];
  /** Layout node that owns the fragment. */
  readonly node: QuireLayoutNode;
  /** Text fragment to paint. */
  readonly fragment: QuireTextFragment;
  /** Fragment index within the layout node. */
  readonly fragmentIndex: number;
  /** Decoration text spans available for this render pass. */
  readonly textStyles: readonly QuireDecorationTextSpan[];
  /** Optional text spans already filtered to the fragment range. */
  readonly intersectingTextStyles?: readonly QuireDecorationTextSpan[] | undefined;
  /** Default text fill style. */
  readonly defaultFillStyle: string;
  /** Fill style used behind IME preedit fragments. */
  readonly imePreeditBackgroundFillStyle: string;
  /** Whether IME preedit fragments should render a background. */
  readonly imePreeditBackground: boolean;
  /** Whether IME preedit fragments should render the standard underline. */
  readonly imePreeditUnderline: boolean;
  /** Document range occupied by IME preedit text in the speculative layout state. */
  readonly imePreeditRange?: QuireDocumentRange | undefined;
}

/**
 * Appends one text fragment, splitting it at decoration text-style boundaries.
 *
 * @param options - Fragment, active decoration spans, and command sink.
 */
export function appendStyledTextFragmentCommands(
  options: StyledTextFragmentCommandsOptions
): void {
  if (options.fragment.hiddenText === "collapsed") {
    return;
  }
  const spans = options.intersectingTextStyles ??
    collectIntersectingTextSpans(options.textStyles, options.fragment.range);
  // The document's own glyph color and decorations (from the mark cascade) are
  // the base; transient decoration spans layer/override on top.
  const baseFillStyle = options.fragment.textColor ?? options.defaultFillStyle;
  const baseDecoration = resolveMarkDecorationLines(options.fragment, baseFillStyle);
  const preeditRange = resolveFragmentImePreeditRange(options);
  appendTextBackgroundCommand(options);

  if (spans.length === 0 && preeditRange === undefined) {
    const commandId = createFragmentCommandId(options.node, options.fragmentIndex);
    const textCommand = createTextFragmentCommand({
      id: commandId,
      fragment: options.fragment,
      fillStyle: baseFillStyle
    });
    appendLegacyGlyphEffectCommands(options.commands, textCommand, options.fragment);

    if (baseDecoration.length > 0) {
      appendTextDecorationCommands(
        options.commands,
        commandId,
        options.fragment,
        options.fragment.range,
        0,
        options.fragment.rect.width,
        baseDecoration
      );
    }
    appendTextEmphasisMarkCommands(
      options.commands,
      commandId,
      options.fragment,
      options.fragment.range,
      baseFillStyle
    );
    appendHiddenTextInspectionCue(options, commandId);
    return;
  }

  const boundaries = resolveFragmentTextStyleBoundaries(
    options.fragment,
    spans,
    preeditRange
  );
  const commandPrefix = createFragmentCommandId(options.node, options.fragmentIndex);

  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const from = boundaries[i];
    const to = boundaries[i + 1];

    if (from === undefined || to === undefined) {
      continue;
    }

    const range: QuireDocumentRange = { from, to };

    if (range.from >= range.to) {
      continue;
    }

    const segmentStyle = resolveSegmentTextStyle(
      range,
      spans,
      baseFillStyle,
      baseDecoration
    );
    if (segmentStyle.suppressTextPaint) {
      continue;
    }
    const segment = resolveFragmentSegment(options.fragment, range);
    const commandId = `${commandPrefix}:${i}`;
    const isImePreedit = isRangeInsideImePreedit(
      range,
      preeditRange
    );

    appendImePreeditBackgroundCommand(
      options,
      commandId,
      range,
      segment.localX,
      segment.width,
      isImePreedit
    );
    const textCommand = createTextFragmentCommand({
      id: commandId,
      fragment: options.fragment,
      range,
      text: segment.text,
      localX: segment.localX,
      width: segment.width,
      glyphs: segment.glyphs,
      fillStyle: segmentStyle.fillStyle
    });
    appendLegacyGlyphEffectCommands(options.commands, textCommand, options.fragment);
    if (segmentStyle.textDecoration.length > 0) {
      appendTextDecorationCommands(
        options.commands,
        commandId,
        options.fragment,
        range,
        segment.localX,
        segment.width,
        segmentStyle.textDecoration
      );
    }
    appendTextEmphasisMarkCommands(
      options.commands,
      commandId,
      options.fragment,
      range,
      segmentStyle.fillStyle
    );
    appendImePreeditUnderlineCommand(
      options,
      commandId,
      range,
      segment.localX,
      segment.width,
      isImePreedit,
      segmentStyle.fillStyle
    );
  }
  appendHiddenTextInspectionCue(options, commandPrefix);
}

/**
 * Appends the paint-only diagnostic used by formatting-inspection mode.
 *
 * The fragment has already participated in ordinary shaping and pagination.
 * This dotted underline consumes only its retained geometry and cannot alter
 * advance, line metrics, hit testing, or document state.
 *
 * @param options - Fragment command inputs and command sink.
 * @param commandId - Stable id prefix for the fragment.
 * @returns Nothing.
 */
function appendHiddenTextInspectionCue(
  options: StyledTextFragmentCommandsOptions,
  commandId: string
): void {
  const fragment = options.fragment;
  if (fragment.hiddenText !== "inspection" || fragment.rect.width <= 0) {
    return;
  }

  const y = Math.min(
    fragment.baseline + 2,
    fragment.rect.y + fragment.rect.height - 1
  );
  options.commands.push({
    id: `${commandId}:hidden-text-inspection`,
    kind: "line",
    layer: "content",
    range: fragment.range,
    from: { x: fragment.rect.x, y },
    to: { x: fragment.rect.x + fragment.rect.width, y },
    strokeStyle: "rgba(98, 83, 170, 0.58)",
    lineWidth: 1,
    lineDash: [1.5, 2],
    lineCap: "round"
  } satisfies QuireLineCommand);
}

/**
 * Appends the canonical character background behind one laid-out fragment.
 *
 * The fragment has already been split at mark and line boundaries, so its
 * run rectangle is the exact renderer-neutral authority for the fill.
 * Transient selection and IME products remain separate layers.
 *
 * @param options - Fragment command options containing the command sink.
 * @returns Nothing.
 */
function appendTextBackgroundCommand(
  options: StyledTextFragmentCommandsOptions
): void {
  const fillStyle = options.fragment.textBackgroundColor;

  if (
    fillStyle === undefined
    || fillStyle.trim().length === 0
    || options.fragment.rect.width <= 0
  ) {
    return;
  }

  options.commands.push({
    id: `${createFragmentCommandId(
      options.node,
      options.fragmentIndex
    )}:text-background`,
    kind: "fill-rect",
    layer: "content",
    range: options.fragment.range,
    rect: resolveQuireTextFragmentRunRect(options.fragment),
    fillStyle
  } satisfies QuireFillRectCommand);
}

/**
 * Appends the optional background for one IME preedit fragment.
 *
 * @param options - Fragment command options containing the command sink and styles.
 * @param commandId - Stable id prefix for the owning fragment command.
 * @param range - Document range represented by the preedit segment.
 * @param localX - Horizontal offset from the fragment left edge.
 * @param width - Segment width.
 * @param isImePreedit - Whether the fragment belongs to the preedit run.
 */
function appendImePreeditBackgroundCommand(
  options: StyledTextFragmentCommandsOptions,
  commandId: string,
  range: QuireDocumentRange,
  localX: number,
  width: number,
  isImePreedit: boolean
): void {
  if (
    !isImePreedit ||
    !options.imePreeditBackground ||
    width <= 0
  ) {
    return;
  }

  options.commands.push({
    id: `${commandId}:ime-preedit-background`,
    kind: "fill-rect",
    layer: "content",
    range,
    rect: {
      ...resolveQuireTextFragmentRunRect(options.fragment),
      x: options.fragment.rect.x + localX,
      width
    },
    fillStyle: options.imePreeditBackgroundFillStyle
  } satisfies QuireFillRectCommand);
}

/**
 * Appends the standard underline for one IME preedit fragment.
 *
 * @param options - Fragment command options containing the command sink and styles.
 * @param commandId - Stable id prefix for the owning fragment command.
 * @param range - Document range represented by the preedit segment.
 * @param localX - Horizontal offset from the fragment left edge.
 * @param width - Segment width.
 * @param isImePreedit - Whether the fragment belongs to the preedit run.
 * @param fillStyle - Resolved glyph fill style for the fragment.
 */
function appendImePreeditUnderlineCommand(
  options: StyledTextFragmentCommandsOptions,
  commandId: string,
  range: QuireDocumentRange,
  localX: number,
  width: number,
  isImePreedit: boolean,
  fillStyle: string
): void {
  if (
    !isImePreedit ||
    !options.imePreeditUnderline ||
    width <= 0
  ) {
    return;
  }

  const y = options.fragment.baseline + 2;
  options.commands.push({
    id: `${commandId}:ime-preedit-underline`,
    kind: "line",
    layer: "content",
    range,
    from: {
      x: options.fragment.rect.x + localX,
      y
    },
    to: {
      x: options.fragment.rect.x + localX + width,
      y
    },
    strokeStyle: fillStyle,
    lineWidth: 1
  } satisfies QuireLineCommand);
}

/**
 * Resolves the part of the text fragment occupied by IME preedit text.
 *
 * @param options - Fragment command options carrying the optional preedit range.
 * @returns Intersecting preedit range, or undefined when the fragment is stable content.
 */
function resolveFragmentImePreeditRange(
  options: StyledTextFragmentCommandsOptions
): QuireDocumentRange | undefined {
  const preeditRange = options.imePreeditRange;
  if (preeditRange === undefined) {
    return undefined;
  }

  const from = Math.max(options.fragment.range.from, preeditRange.from);
  const to = Math.min(options.fragment.range.to, preeditRange.to);

  return from < to ? { from, to } : undefined;
}

/**
 * Checks whether a segment is fully inside the IME preedit range.
 *
 * @param range - Fragment segment range.
 * @param preeditRange - Intersecting preedit range for the parent fragment.
 * @returns Whether the segment should receive preedit affordance paint.
 */
function isRangeInsideImePreedit(
  range: QuireDocumentRange,
  preeditRange: QuireDocumentRange | undefined
): boolean {
  return preeditRange !== undefined &&
    range.from >= preeditRange.from &&
    range.to <= preeditRange.to;
}
