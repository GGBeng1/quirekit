import { registerNativeTextblockReflow } from "./reflow/service";
import type { ShapeTextblockFragmentsRequest, ShapeTextblockFragmentsResult } from "./shaping/types";
export type { ShapeTextblockFragmentsRequest, ShapeTextblockFragmentsResult } from "./shaping/types";
import { resolveShapeIndentationGeometry } from "./shaping/geometry";
import { projectTextblockLineOptions } from "./shaping/line-options";
import {
  resolveTextblockDirtyTextEdit,
  resolveTextblockDirtyTextOffset
} from "./dirty-edit";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { CanvasBlockShapeCache } from "../../../layout/cache";
import { layoutQuireInlineTextFragmentsFromQuireLayout } from "@quirekit/layout/inline";
import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import type {
  QuireTextLineSlot
} from "@quirekit/renderer";
import type {
  QuireBlockFlowExclusion,
  QuireBlockTextFlowReflow
} from "../../../layout/engine/block-types";
import { createQuireTextblockTailLineCheckpoints } from "../../../layout/cache/block/checkpoints";
import {
  areQuireTextblockTailFragmentsNativeMetricOnly,
  createQuireTextblockReplacementSignature,
  createQuireTextblockTailRunSignature,
  type QuireTextblockTailTextEditHint,
  tryReuseQuireTextblockTailFragments
} from "./tail";
import {
  createQuireTextblockFlowShapeCacheVariant,
  convergeQuireTextblockFlowShape,
  hasQuireTextblockFlowExclusion,
  quireTextblockFlowBaselineCacheVariant,
  resolveQuireTextblockFlowBaseline,
  resolveQuireTextblockFlowExclusions,
  resolveQuireTextblockFlowSlots
} from "./flow-exclusion";
import {
  resolveQuireTextblockLineSlots
} from "./indentation";

const retainedTailShapeMinimumTextLength = 2048;
const maxTextblockFlowExclusionPasses = 4;

/**
 * Shapes a textblock's inline runs into wrapped fragments, reusing the per-block
 * shape cache when available.
 *
 * The cache is keyed by node identity, content width, and exact flow geometry.
 * An unchanged block at an unchanged width returns its previous fragments
 * without re-measuring. Cached and uncached paths produce identical fragments.
 *
 * @param request - Node, shape cache, runs, metrics, and inline layout inputs.
 * @returns Wrapped measured text fragments in visual line order.
 */
export function shapeTextblockFragments(
  request: ShapeTextblockFragmentsRequest
): ShapeTextblockFragmentsResult {
  const { options, node } = request;
  const width = options.width;
  const cacheVariant = createTextblockShapeCacheVariant(request);
  const cache = options.blockShapeCache;
  const hasFlowExclusion = hasQuireTextblockFlowExclusion(
    request.sourceCapabilities
  );
  const cacheable = cache !== undefined;
  const tailCacheable = cache !== undefined
    && !hasFlowExclusion
    && request.lineMetricContributions === undefined
    && request.finalLineMetricContribution === undefined
    && request.tabs === undefined
    && (request.alignment ?? "start") === "start";
  const tailRun = request.tabs === undefined && request.runs.length === 1 ? request.runs[0] : undefined;
  const tailRunSignature =
    tailRun === undefined
      ? undefined
      : createTextblockShapeRunSignature(request, tailRun);

  // Both modes reuse complete geometry; justification cannot reuse a partial tail.
  if (cache !== undefined && !hasFlowExclusion && (tailCacheable || request.alignment === "justify" || request.tabs !== undefined)) {
    if (tailCacheable && tailRun === undefined) {
      cache.recordTextblockTailBypass("multi-run");
    }

    const cached = cache.get(node, width, request.contentStart, cacheVariant, request.id);
    if (cached !== undefined) {
      if (tailCacheable && tailRun !== undefined && tailRunSignature !== undefined) {
        cache.recordTextblockTailBypass("fragment-hit");
        storeTextblockTailShape({
          cache,
          request,
          width,
          run: tailRun,
          runSignature: tailRunSignature,
          fragments: cached
        });
      }
      return createTextblockShapeResult(cached);
    }

    if (
      tailCacheable
      && tailRun !== undefined
      && tailRunSignature !== undefined
    ) {
      const tailFragments = tryReuseRetainedTextblockTailShape({
        request,
        cache,
        width,
        run: tailRun,
        runSignature: tailRunSignature
      });

      if (tailFragments !== undefined) {
        return createTextblockShapeResult(tailFragments);
      }
    }
  }

  // First shape establishes source-position and paragraph-local row geometry.
  // Rectangle exclusions then compile physical slots for every intersecting
  // row, including text that precedes the anchor in document order.
  const baselineFragments = hasFlowExclusion && cache !== undefined
    ? resolveQuireTextblockFlowBaseline({
        cache,
        node,
        width,
        contentStart: request.contentStart,
        id: request.id,
        cacheVariant: createTextblockShapeCacheVariant(
          request,
          quireTextblockFlowBaselineCacheVariant
        ),
        shape: () => layoutTextblockFragments(request)
      })
    : layoutTextblockFragments(request);
  if (hasFlowExclusion) {
    const convergence = convergeQuireTextblockFlowShape({
      baselineFragments,
      maxPasses: maxTextblockFlowExclusionPasses,
      resolveSlots: (fragments) => resolveQuireTextblockFlowSlots({
        fragments,
        sourceAnchors: request.sourceAnchors,
        sourceCapabilities: request.sourceCapabilities,
        width,
        lineHeight: request.metrics.lineHeight
      }),
      shape: (flowSlots) => {
        if (flowSlots === undefined) {
          return baselineFragments;
        }
        return reflowTextblockFragmentsAgainstFlowSlots(
          request,
          flowSlots.lineSlots,
          flowSlots.signature
        );
      }
    });

    if (convergence.status === "non-convergent") {
      return {
        fragments: convergence.fragments,
        flowExclusions: [],
        flowExclusionGaps: convergence.participants.map((participant) => ({
          code: "flow-exclusion-non-convergence",
          sourceAnchorId: participant.sourceAnchorId,
          objectId: participant.objectId,
          message: `Flow exclusion did not converge after ${maxTextblockFlowExclusionPasses} shaped passes.`
        }))
      };
    }

    if (convergence.flowSlots !== undefined) {
      const flowVariant = createTextblockShapeCacheVariant(
        request,
        createQuireTextblockFlowShapeCacheVariant(
          convergence.flowSlots.signature
        )
      );
      cache?.set(node, width, request.contentStart, convergence.fragments, flowVariant, request.id);
      const flowExclusions = resolveBlockFlowExclusions(
        request,
        convergence.fragments
      );
      return createTextblockShapeResult(
        convergence.fragments,
        flowExclusions
      );
    }
  }

  const fragments = baselineFragments;

  if (cacheable) {
    cache.set(node, width, request.contentStart, fragments, cacheVariant, request.id);
    if (tailRun !== undefined && tailRunSignature !== undefined) {
      storeTextblockTailShape({
        cache,
        request,
        width,
        run: tailRun,
        runSignature: tailRunSignature,
        fragments
      });
    }
  }

  return createTextblockShapeResult(fragments);
}

/**
 * Wraps accepted fragments in the stable shaping result contract.
 *
 * @param fragments - Accepted textblock fragments.
 * @returns Shape result without flow-exclusion gaps.
 */
function createTextblockShapeResult(
  fragments: readonly QuireTextFragment[],
  flowExclusions: readonly QuireBlockFlowExclusion[] = []
): ShapeTextblockFragmentsResult {
  return { fragments, flowExclusions, flowExclusionGaps: [] };
}

/**
 * Reshapes one textblock against externally supplied sibling-flow slots.
 *
 * The exact slot signature participates in the existing shape cache so a
 * downstream paragraph can reuse a previously proven multi-paragraph wrap
 * without treating the object-owning paragraph as its cache authority.
 *
 * @param request - Source-bound textblock shaping request.
 * @param lineSlots - Exact physical slots for every affected visual row.
 * @param slotSignature - Stable geometry signature for the supplied slots.
 * @returns Fresh or cached text fragments in textblock-local coordinates.
 */
export function reflowTextblockFragmentsAgainstFlowSlots(
  request: ShapeTextblockFragmentsRequest,
  lineSlots: readonly (readonly QuireTextLineSlot[])[],
  slotSignature: string
): readonly QuireTextFragment[] {
  const flowVariant = createTextblockShapeCacheVariant(
    request,
    createQuireTextblockFlowShapeCacheVariant(slotSignature)
  );
  const cache = request.options.blockShapeCache;
  const cached = cache?.get(request.node, request.options.width, request.contentStart, flowVariant, request.id);
  if (cached !== undefined) {
    return cached;
  }

  const fragments = layoutTextblockFragments(request, lineSlots);
  cache?.set(request.node, request.options.width, request.contentStart, fragments, flowVariant, request.id);
  return fragments;
}

/**
 * Creates the source-bound reflow service consumed by sibling block flow.
 *
 * @param source - Textblock shaping request retained for exact reshaping.
 * @returns Reflow service using the textblock's canonical metrics and cache.
 */
export function createTextblockFlowReflow(
  source: ShapeTextblockFragmentsRequest
): QuireBlockTextFlowReflow {
  // The source may outlive its build; later reflow must not write its old trace.
  const request = { ...source, options: { ...source.options, trace: undefined } };
  return registerNativeTextblockReflow({
    lineHeight: request.metrics.lineHeight,
    /**
     * Reshapes this source textblock against sibling-flow slots.
     *
     * @param lineSlots - Exact physical slots for affected visual rows.
     * @param slotSignature - Stable geometry signature for cache identity.
     * @returns Text fragments and exclusions resolved from their anchor topology.
     */
    reflow(lineSlots, slotSignature) {
      const textFragments = reflowTextblockFragmentsAgainstFlowSlots(
        request,
        lineSlots,
        slotSignature
      );
      return {
        textFragments,
        localFlowExclusions: resolveBlockFlowExclusions(request, textFragments)
      };
    },
    /**
     * Reshapes evaluated inline fields with their occurrence-specific advances.
     *
     * @param replacements - Measured extents keyed by logical source anchor id.
     * @returns Fresh runs and fragments in textblock-local coordinates.
     */
    reflowInlineReplacements(replacements) {
      const textRuns = replaceInlineOccurrenceExtents(request.runs, replacements);
      const occurrenceRequest: ShapeTextblockFragmentsRequest = {
        ...request,
        runs: textRuns,
        options: {
          ...request.options,
          blockShapeCache: undefined
        }
      };
      return {
        textRuns,
        textFragments: shapeTextblockFragments(occurrenceRequest).fragments
      };
    }
  });
}

/**
 * Applies evaluated occurrence extents without mutating canonical source runs.
 *
 * @param runs - Canonical source runs containing logical replacement identities.
 * @param replacements - Exact extents keyed by source anchor id.
 * @returns Runs whose matching replacements reserve the evaluated advances.
 */
function replaceInlineOccurrenceExtents(
  runs: readonly QuireInlineTextRun[],
  replacements: Parameters<
    QuireBlockTextFlowReflow["reflowInlineReplacements"]
  >[0]
): readonly QuireInlineTextRun[] {
  return runs.map((run) => {
    const replacement = run.replacement === undefined
      ? undefined
      : replacements.get(run.replacement.sourceAnchorId);
    return replacement === undefined || run.replacement === undefined
      ? run
      : {
          ...run,
          replacement: {
            ...run.replacement,
            inlineSize: replacement.inlineSize,
            blockSize: replacement.blockSize,
            ...(replacement.baselineOffset === undefined
              ? {}
              : { baselineOffset: replacement.baselineOffset })
          }
        };
  });
}

/**
 * Resolves sibling-flow exclusions from one shaped textblock result.
 *
 * Anchor caret topology can move when external slots reshape the paragraph, so
 * exclusion geometry must be regenerated in the same pass as its fragments.
 *
 * @param request - Source anchors, capabilities, width, and line metrics.
 * @param fragments - Freshly shaped text fragments.
 * @returns Accepted block-flow exclusions in textblock-local coordinates.
 */
function resolveBlockFlowExclusions(
  request: ShapeTextblockFragmentsRequest,
  fragments: readonly QuireTextFragment[]
): readonly QuireBlockFlowExclusion[] {
  return resolveQuireTextblockFlowExclusions({
    fragments,
    sourceAnchors: request.sourceAnchors,
    sourceCapabilities: request.sourceCapabilities,
    width: request.options.width,
    lineHeight: request.metrics.lineHeight
  }).map((exclusion) => ({
    sourceAnchorId: exclusion.participant.sourceAnchorId,
    objectId: exclusion.participant.objectId,
    rect: exclusion.rect,
    geometry: exclusion.geometry
  }));
}

/**
 * Tries to shape a changed textblock only from a retained tail-shape entry.
 *
 * This is used for active textblocks that are outside the current
 * viewport-first `maxBlocks` window. It deliberately has no full-shape fallback:
 * when no retained checkpoint can prove the local edit, the caller should keep
 * the estimated block input instead of accidentally shaping an over-page
 * paragraph during focused input.
 *
 * @param request - Node, shape cache, runs, metrics, and inline layout inputs.
 * @returns Reused full-fragment list, or undefined when retained local reuse is unavailable.
 */
export function tryShapeTextblockFragmentsFromRetainedTail(
  request: ShapeTextblockFragmentsRequest
): readonly QuireTextFragment[] | undefined {
  const { options } = request;
  const cache = options.blockShapeCache;

  if (cache === undefined) {
    return undefined;
  }
  if (request.lineMetricContributions !== undefined) {
    return undefined;
  }
  if (request.finalLineMetricContribution !== undefined) {
    return undefined;
  }
  if (hasQuireTextblockFlowExclusion(request.sourceCapabilities)) {
    return undefined;
  }
  if (request.tabs !== undefined || (request.alignment ?? "start") !== "start") {
    return undefined;
  }

  const run = request.runs.length === 1 ? request.runs[0] : undefined;
  if (run === undefined) {
    cache.recordTextblockTailBypass("multi-run");
    return undefined;
  }

  return tryReuseRetainedTextblockTailShape({
    request,
    cache,
    width: options.width,
    run,
    runSignature: createTextblockShapeRunSignature(request, run)
  });
}

/**
 * Runs the canonical inline text primitive with optional paragraph-local slots.
 *
 * @param request - Textblock shaping request.
 * @param lineSlots - Optional physical slots for each visual row.
 * @returns Wrapped text fragments in visual order.
 */
function layoutTextblockFragments(
  request: ShapeTextblockFragmentsRequest,
  lineSlots?: readonly (readonly QuireTextLineSlot[])[]
): readonly QuireTextFragment[] {
  const { options } = request;
  const geometry = resolveShapeIndentationGeometry(request);
  const resolvedLineSlots = resolveQuireTextblockLineSlots({
    geometry,
    ...(lineSlots === undefined ? {} : { flowSlots: lineSlots })
  });
  return layoutQuireInlineTextFragmentsFromQuireLayout({
    id: request.id,
    runs: request.runs,
    rect: {
      x: geometry.x,
      y: 0,
      width: geometry.width,
      height: request.metrics.lineHeight
    },
    ...projectTextblockLineOptions(request),
    ...(request.lineMetricContributions === undefined
      ? {}
      : { lineMetricContributions: request.lineMetricContributions }),
    ...(request.finalLineMetricContribution === undefined
      ? {}
      : { finalLineMetricContribution: request.finalLineMetricContribution }),
    alignment: request.alignment ?? "start",
    tabs: request.tabs === undefined ? undefined : {
      ...request.tabs,
      offset: (request.tabs.offset ?? 0) + (request.baseDirection === "rtl"
        ? options.width - geometry.x - geometry.width : geometry.x)
    },
    justifySoftBreaks: options.paragraphStyleContext?.justifySoftBreaks ?? true,
    ...(resolvedLineSlots === undefined ? {} : { lineSlots: resolvedLineSlots })
  });
}

/**
 * Creates the retained shape identity for text style, direction, and paragraph geometry.
 *
 * @param request - Active textblock shaping request.
 * @param run - Single inline run eligible for retained-tail reuse.
 * @returns Stable signature that invalidates reuse when indentation changes.
 */
function createTextblockShapeRunSignature(
  request: ShapeTextblockFragmentsRequest,
  run: QuireInlineTextRun
): string {
  const geometry = resolveShapeIndentationGeometry(request);
  const markerSignature = request.wordNumberingMarker === undefined
    ? ""
    : `\u0006${request.wordNumberingMarker.text}\u0006${request.wordNumberingMarker.kind}`;
  return `${createQuireTextblockTailRunSignature(
    run,
    request.baseDirection
  )}\u0006${request.alignment ?? "start"}\u0006${request.options.paragraphStyleContext?.justifySoftBreaks ?? true}\u0006${request.avoidPunctuationBreaks !== false}:${JSON.stringify(request.autoSpacing)}\u0006${JSON.stringify(request.metrics)}\u0006${geometry.signature}${markerSignature}`;
}

/**
 * Reuses a retained textblock tail shape and updates the shape caches on success.
 *
 * @param input - Request, cache, run, signature, and width for the reuse attempt.
 * @returns Reused fragments, or undefined when reuse is unavailable.
 */
function tryReuseRetainedTextblockTailShape(input: {
  readonly request: ShapeTextblockFragmentsRequest;
  readonly cache: CanvasBlockShapeCache;
  readonly width: number;
  readonly run: QuireInlineTextRun;
  readonly runSignature: string;
}): readonly QuireTextFragment[] | undefined {
  const previous = input.cache.getTextblockTailShape(
    input.request.id,
    input.width,
    input.request.contentStart,
    input.runSignature
  );
  let convergenceLookaheadLines = previous?.convergenceLookaheadLines;
  const fragments =
    previous === undefined
      ? undefined
      : tryReuseQuireTextblockTailFragments({
          previous,
          id: input.request.id,
          run: input.run,
          runSignature: input.runSignature,
          metrics: input.request.metrics,
          baseDirection: input.request.baseDirection,
          avoidPunctuationBreaks: input.request.avoidPunctuationBreaks, autoSpacing: input.request.autoSpacing,
          contentStart: input.request.contentStart,
          dirtyTextEdit: resolveTextblockDirtyTextEdit(
            input.request.options.layoutDirtyRange,
            input.request.contentStart,
            input.request.contentEnd
          ),
          dirtyTextOffset: resolveTextblockDirtyTextOffset(
            input.request.options.layoutDirtyRange,
            input.request.contentStart,
            input.request.contentEnd
          ),
          width: input.width,
          options: input.request.options,
          onReuseOutcome: (outcome) => {
            input.cache.recordTextblockTailReuseOutcome(outcome);
          },
          onConvergedSuffixLookahead: (lookaheadLines) => {
            convergenceLookaheadLines = lookaheadLines;
          }
        });

  if (fragments === undefined) {
    return undefined;
  }

  input.cache.set(
    input.request.node,
    input.width,
    input.request.contentStart,
    fragments,
    createTextblockShapeCacheVariant(input.request),
    input.request.id
  );
  storeTextblockTailShape({
    cache: input.cache,
    request: input.request,
    width: input.width,
    run: input.run,
    runSignature: input.runSignature,
    fragments,
    convergenceLookaheadLines
  });

  return fragments;
}

/**
 * Combines paragraph measurement authority with an optional flow variant.
 *
 * @param request - Source-bound textblock shaping request.
 * @param localVariant - Optional flow or baseline dependency.
 * @returns Stable fragment-cache variant.
 */
function createTextblockShapeCacheVariant(
  request: ShapeTextblockFragmentsRequest,
  localVariant?: string
): string {
  const compatibilityVariant = request.alignment === "justify"
    ? `\u0000justify:${request.options.paragraphStyleContext?.justifySoftBreaks ?? true}`
    : "";
  // Inline objects may report their extent after the node exists (prepared graphics),
  // so their resolved extents are part of the shape identity, not only the node.
  const replacementVariant = request.runs
    .map(createQuireTextblockReplacementSignature)
    .filter(Boolean)
    .join(",");
  const tabVariant = request.tabs === undefined ? "" : `\u0000tabs:${JSON.stringify(request.tabs)}`;
  // Line metrics contributed from outside the runs and a numbering marker's
  // body indentation change the shape without changing the paragraph node.
  const metricVariant = request.lineMetricContributions === undefined && request.finalLineMetricContribution === undefined
    ? "" : `\u0000metrics:${JSON.stringify(request.lineMetricContributions ?? null)}:${JSON.stringify(request.finalLineMetricContribution ?? null)}`;
  const markerVariant = request.wordNumberingMarker === undefined ? "" : `\u0000marker:${resolveShapeIndentationGeometry(request).signature}`;
  const measurementVariant = `${request.cacheVariant ?? "default"}\u0000punctuation:${request.avoidPunctuationBreaks !== false}:${JSON.stringify(request.autoSpacing)}${tabVariant}${compatibilityVariant}${metricVariant}${markerVariant}${replacementVariant ? `\u0000inline:${replacementVariant}` : ""}`;
  return localVariant === undefined
    ? measurementVariant
    : `${measurementVariant}\u0000${localVariant}`;
}

/**
 * Stores the latest simple textblock shape for future local insert/delete reuse.
 *
 * @param input - Cache, request, single run, signature, and shaped fragments.
 * @returns Nothing.
 */
function storeTextblockTailShape(input: {
  readonly cache: CanvasBlockShapeCache;
  readonly request: ShapeTextblockFragmentsRequest;
  readonly width: number;
  readonly run: QuireInlineTextRun;
  readonly runSignature: string;
  readonly fragments: readonly QuireTextFragment[];
  readonly convergenceLookaheadLines?: number | undefined;
}): void {
  if (input.run.text.length < retainedTailShapeMinimumTextLength) {
    return;
  }

  input.cache.setTextblockTailShape({
    width: input.width,
    id: input.request.id,
    contentStart: input.request.contentStart,
    runSignature: input.runSignature,
    text: input.run.text,
    fragments: input.fragments,
    lineCheckpoints: createQuireTextblockTailLineCheckpoints(
      input.fragments,
      input.request.contentStart
    ),
    usesNativeMetricLayout: areQuireTextblockTailFragmentsNativeMetricOnly(
      input.fragments
    ),
    convergenceLookaheadLines: input.convergenceLookaheadLines
  });
}
