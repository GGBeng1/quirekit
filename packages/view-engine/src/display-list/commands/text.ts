import {
  doesQuireRectIntersectAny,
  type QuireDisplayCommand,
  type QuireDocumentRange,
  type QuireTextCommand
} from "@quirekit/renderer";
import type { QuireDecorationTextSpan } from "../../decorations";
import type { QuireLayoutNode } from "../../layout";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { clipFixedLineTextCommands } from "../text/line-clip";
import { createFragmentCommandId } from "../text/fragment/command";
import type { QuireTextCommandTraceStats } from "../text/types";
import {
  appendStyledTextFragmentCommands,
  collectIntersectingTextSpans
} from "../text";
import type {
  QuireDisplayListOptions,
  QuireDisplayListStyles
} from "../types";

const emptyDecorationTextSpans: readonly QuireDecorationTextSpan[] = [];
const maxTextNodeCommandCacheFragments = 16;

type TextCommandTraceCounter =
  | "textStyleDurationMs"
  | "cacheLookupDurationMs"
  | "cacheReuseDurationMs"
  | "commandBuildDurationMs"
  | "cacheStoreDurationMs";

/** Ordered build phases, shared by every trace without allocating per frame. */
const textCommandTracePhases: readonly (readonly [string, TextCommandTraceCounter])[] = [
  ["display-list:text-style-spans", "textStyleDurationMs"],
  ["display-list:text-cache-lookup", "cacheLookupDurationMs"],
  ["display-list:text-cache-reuse", "cacheReuseDurationMs"],
  ["display-list:text-command-build", "commandBuildDurationMs"],
  ["display-list:text-cache-store", "cacheStoreDurationMs"]
];

/**
 * Appends text commands for one layout node without allocating a single-node list.
 *
 * @param commands - Mutable display command list being built.
 * @param node - Layout node to convert into text commands.
 * @param options - Display-list build options containing the source snapshot.
 * @param styles - Resolved display-list styles.
 * @param traceStats - Optional aggregate diagnostics for text command work.
 * @param skipFragmentClip - Whether the owning node is already fully inside the clip.
 */
export function appendTextNodeCommands(
  commands: QuireDisplayCommand[],
  node: QuireLayoutNode,
  options: QuireDisplayListOptions,
  styles: QuireDisplayListStyles,
  traceStats?: QuireTextCommandTraceStats | undefined
): void {
  const children = node.children;
  if (children !== undefined && children.length > 0) {
    for (let index = 0; index < children.length; index += 1) {
      appendTextNodeCommands(commands, children[index]!, options, styles, traceStats);
    }
    return;
  }

  const text = extractNodeText(options, node.range);

  if (node.textFragments && node.textFragments.length > 0) {
    appendTextFragmentCommands(
      commands,
      node,
      styles,
      options,
      options.decorationLane?.textStyles ?? emptyDecorationTextSpans,
      traceStats
    );
    return;
  }

  if (text.length === 0) {
    return;
  }

  commands.push({
    id: `${node.id}:text`,
    kind: "text",
    range: node.range,
    rect: node.rect,
    text,
    origin: {
      x: node.rect.x,
      y: node.rect.y + styles.textBaselineOffset
    },
    font: styles.font,
    fillStyle: styles.textFillStyle
  } satisfies QuireTextCommand);
}

/**
 * Creates aggregate text-command trace state for one content build.
 *
 * @param trace - Optional display-list trace sink.
 * @returns Mutable trace state, or undefined when tracing is disabled.
 */
export function createQuireTextCommandTraceStats(
  trace: QuireDisplayListOptions["trace"]
): QuireTextCommandTraceStats | undefined {
  if (!trace) {
    return undefined;
  }

  return {
    trace,
    startedAt: readQuireTextCommandTraceTime(),
    textStyleDurationMs: 0,
    cacheLookupDurationMs: 0,
    cacheReuseDurationMs: 0,
    commandBuildDurationMs: 0,
    cacheStoreDurationMs: 0
  };
}

/**
 * Emits aggregate text-command phases collected during one content build.
 *
 * @param stats - Mutable trace state, or undefined when tracing is disabled.
 */
export function emitQuireTextCommandTraceStats(
  stats: QuireTextCommandTraceStats | undefined
): void {
  if (!stats) {
    return;
  }

  let cursor = stats.startedAt;
  for (const [name, counter] of textCommandTracePhases) {
    cursor = emitQuireTextCommandTracePhase(stats, name, stats[counter], cursor);
  }
}

/**
 * Appends measured text fragment commands to a display command list.
 *
 * @param commands - Mutable display command list being built.
 * @param node - Layout node whose text fragments should be drawn.
 * @param styles - Resolved display-list styles.
 * @param options - Display-list build options containing cache and decoration inputs.
 * @param textStyles - Transient decoration text-style spans for this render pass.
 * @param traceStats - Optional aggregate diagnostics for text command work.
 */
function appendTextFragmentCommands(
  commands: QuireDisplayCommand[],
  node: QuireLayoutNode,
  styles: QuireDisplayListStyles,
  options: QuireDisplayListOptions,
  textStyles: readonly QuireDecorationTextSpan[],
  traceStats?: QuireTextCommandTraceStats | undefined
): void {
  const hasTransientTextStyles = textStyles.length > 0;
  const fragments = node.textFragments;

  if (fragments === undefined) {
    return;
  }

  const commandCache = options.commandCache;
  const canUseNodeCommandCache =
    commandCache !== undefined &&
    isTextNodeCommandCacheable(
      node,
      fragments,
      textStyles,
      options.clipRects,
      options.imePreeditRange
    );
  const shouldPromoteShiftSignatureHits =
    fragments.length <= maxTextNodeCommandCacheFragments;
  const cachedNodeCommands = !canUseNodeCommandCache
    ? undefined
    : measureQuireTextCommandTrace(
        traceStats,
        "cacheLookupDurationMs",
        () => commandCache.getTextNodeCommandsByKey(
          node,
          node.id,
          styles.textFillStyle,
          fragments
        )
      );

  if (cachedNodeCommands !== undefined) {
    measureQuireTextCommandTrace(
      traceStats,
      "cacheReuseDurationMs",
      () => appendCachedTextFragmentCommands(commands, cachedNodeCommands)
    );
    return;
  }

  const nodeCommandStart = commands.length;

  for (let index = 0; index < fragments.length; index += 1) {
    const fragment = fragments[index]!;
    if (!doesTextFragmentIntersectClip(fragment, options.clipRects)) {
      continue;
    }
    const intersectsImePreedit =
      doesTextFragmentIntersectImePreeditRange(
        fragment,
        options.imePreeditRange
      );

    let intersectingTextStyles = emptyDecorationTextSpans;
    if (hasTransientTextStyles) {
      const startedAt = traceStats === undefined
        ? 0
        : readQuireTextCommandTraceTime();
      intersectingTextStyles = collectIntersectingTextSpans(
        textStyles,
        fragment.range
      );
      if (traceStats !== undefined) {
        traceStats.textStyleDurationMs +=
          readQuireTextCommandTraceTime() - startedAt;
      }
    }

    let cachedCommands: readonly QuireDisplayCommand[] | undefined;
    if (intersectingTextStyles.length === 0 && !intersectsImePreedit) {
      const startedAt = traceStats === undefined
        ? 0
        : readQuireTextCommandTraceTime();
      cachedCommands = commandCache?.getTextFragmentCommandsByKey(
        fragment,
        node.id,
        index,
        styles.textFillStyle,
        shouldPromoteShiftSignatureHits
      );
      if (traceStats !== undefined) {
        traceStats.cacheLookupDurationMs +=
          readQuireTextCommandTraceTime() - startedAt;
      }
    }

    if (cachedCommands !== undefined) {
      const startedAt = traceStats === undefined
        ? 0
        : readQuireTextCommandTraceTime();
      appendCachedTextFragmentCommands(commands, cachedCommands);
      if (traceStats !== undefined) {
        traceStats.cacheReuseDurationMs +=
          readQuireTextCommandTraceTime() - startedAt;
      }
      continue;
    }

    const commandStart = commands.length;

    const commandBuildStartedAt = traceStats === undefined
      ? 0
      : readQuireTextCommandTraceTime();
    appendStyledTextFragmentCommands({
      commands,
      node,
      fragment,
      fragmentIndex: index,
      textStyles,
      intersectingTextStyles,
      defaultFillStyle: styles.textFillStyle,
      imePreeditBackgroundFillStyle: styles.imePreeditBackgroundFillStyle,
      imePreeditBackground: styles.imePreeditBackground,
      imePreeditUnderline: styles.imePreeditUnderline,
      imePreeditRange: options.imePreeditRange
    });
    clipFixedLineTextCommands(commands, commandStart, fragment, createFragmentCommandId(node, index));
    if (traceStats !== undefined) {
      traceStats.commandBuildDurationMs +=
        readQuireTextCommandTraceTime() - commandBuildStartedAt;
    }

    if (
      intersectingTextStyles.length === 0 &&
      !intersectsImePreedit &&
      commandCache !== undefined
    ) {
      const cacheKey = {
        nodeId: node.id,
        fragmentIndex: index,
        defaultFillStyle: styles.textFillStyle
      };

      const cacheStoreStartedAt = traceStats === undefined
        ? 0
        : readQuireTextCommandTraceTime();
      commandCache.setTextFragmentCommands(
        fragment,
        cacheKey,
        commands.slice(commandStart)
      );
      if (traceStats !== undefined) {
        traceStats.cacheStoreDurationMs +=
          readQuireTextCommandTraceTime() - cacheStoreStartedAt;
      }
    }

  }

  if (canUseNodeCommandCache) {
    measureQuireTextCommandTrace(
      traceStats,
      "cacheStoreDurationMs",
      () => commandCache.setTextNodeCommandsByKey(
        node,
        node.id,
        styles.textFillStyle,
        fragments,
        commands.slice(nodeCommandStart)
      )
    );
  }
}

/**
 * Appends cached text-fragment commands without spreading per fragment.
 *
 * @param target - Mutable display command list being built.
 * @param cachedCommands - Cached commands for one text fragment.
 * @returns Nothing.
 */
function appendCachedTextFragmentCommands(
  target: QuireDisplayCommand[],
  cachedCommands: readonly QuireDisplayCommand[]
): void {
  const targetStartIndex = target.length;
  for (let index = 0; index < cachedCommands.length; index += 1) {
    target[targetStartIndex + index] = cachedCommands[index]!;
  }
}

/**
 * Reports whether a text fragment intersects the active display-list clip.
 *
 * @param fragment - Text fragment to test.
 * @param clipRects - Active document-space clip rectangles.
 * @returns Whether the fragment should emit display commands.
 */
function doesTextFragmentIntersectClip(
  fragment: QuireTextFragment,
  clipRects: QuireDisplayListOptions["clipRects"]
): boolean {
  if (clipRects === undefined || clipRects.length === 0) {
    return true;
  }

  return doesQuireRectIntersectAny(fragment.rect, clipRects);
}

/**
 * Checks whether a complete text node command slice can be cached safely.
 *
 * @param node - Text layout node being converted.
 * @param fragments - Text fragments owned by the node.
 * @param textStyles - Transient text decoration spans for this render.
 * @param clipRects - Active display-list clip rectangles.
 * @param imePreeditRange - Optional transient IME preedit range.
 * @returns Whether the node command slice is stable for reuse.
 */
function isTextNodeCommandCacheable(
  node: QuireLayoutNode,
  fragments: readonly QuireTextFragment[],
  textStyles: readonly QuireDecorationTextSpan[],
  clipRects: QuireDisplayListOptions["clipRects"],
  imePreeditRange: QuireDocumentRange | undefined
): boolean {
  if (
    textStyles.length > 0 ||
    fragments.length > maxTextNodeCommandCacheFragments ||
    fragments.some((fragment) => doesTextFragmentIntersectImePreeditRange(
      fragment,
      imePreeditRange
    )) ||
    !doesTextNodeFitClip(node, clipRects)
  ) {
    return false;
  }

  return true;
}

/**
 * Checks whether a text fragment intersects the transient IME preedit range.
 *
 * @param fragment - Text fragment to inspect.
 * @param imePreeditRange - Optional transient IME preedit range.
 * @returns Whether the fragment needs preedit-specific command splitting.
 */
function doesTextFragmentIntersectImePreeditRange(
  fragment: QuireTextFragment,
  imePreeditRange: QuireDocumentRange | undefined
): boolean {
  return imePreeditRange !== undefined &&
    fragment.range.from < imePreeditRange.to &&
    fragment.range.to > imePreeditRange.from;
}

/**
 * Checks whether a text node is wholly covered by the active clip.
 *
 * @param node - Layout node to test.
 * @param clipRects - Active display-list clip rectangles.
 * @returns Whether all node fragments can be emitted without per-fragment clipping.
 */
function doesTextNodeFitClip(
  node: QuireLayoutNode,
  clipRects: QuireDisplayListOptions["clipRects"]
): boolean {
  if (clipRects === undefined || clipRects.length === 0) {
    return true;
  }

  for (let index = 0; index < clipRects.length; index += 1) {
    const clipRect = clipRects[index]!;
    if (
      node.rect.x >= clipRect.x &&
      node.rect.x + node.rect.width <= clipRect.x + clipRect.width &&
      node.rect.y >= clipRect.y &&
      node.rect.y + node.rect.height <= clipRect.y + clipRect.height
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Measures one text-command diagnostic bucket when aggregate tracing is enabled.
 *
 * @param stats - Mutable trace state, or undefined when tracing is disabled.
 * @param counter - Duration bucket that should receive the measured time.
 * @param callback - Work to measure.
 * @returns Callback return value.
 */
function measureQuireTextCommandTrace<Result>(
  stats: QuireTextCommandTraceStats | undefined,
  counter: TextCommandTraceCounter,
  callback: () => Result
): Result {
  if (!stats) {
    return callback();
  }

  const startedAt = readQuireTextCommandTraceTime();

  try {
    return callback();
  } finally {
    stats[counter] += readQuireTextCommandTraceTime() - startedAt;
  }
}

/**
 * Emits one aggregate text-command phase when it recorded non-zero duration.
 *
 * @param stats - Trace state that owns the sink.
 * @param name - Stable phase name shown in diagnostics.
 * @param durationMs - Aggregate phase duration.
 * @param cursor - Synthetic timestamp where this aggregate phase should begin.
 * @returns Synthetic timestamp after the aggregate phase.
 */
function emitQuireTextCommandTracePhase(
  stats: QuireTextCommandTraceStats,
  name: string,
  durationMs: number,
  cursor: number
): number {
  if (durationMs <= 0) {
    return cursor;
  }

  const endedAt = cursor + durationMs;
  stats.trace({
    name,
    startedAt: cursor,
    endedAt,
    durationMs
  });

  return endedAt;
}

/**
 * Reads the best monotonic timestamp available to text-command diagnostics.
 *
 * @returns Timestamp in milliseconds.
 */
function readQuireTextCommandTraceTime(): number {
  return globalThis.performance?.now() ?? Date.now();
}

/**
 * Extracts text represented by a document range.
 *
 * @param options - Display-list build options containing the source snapshot.
 * @param range - Document range whose text should be extracted.
 * @returns Text content represented by the range.
 */
function extractNodeText(
  options: QuireDisplayListOptions,
  range: QuireDocumentRange
): string {
  return options.snapshot.state.pm.doc.textBetween(range.from, range.to, "\n", "\n");
}
