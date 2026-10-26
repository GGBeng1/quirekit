import { rebindNativeTextblockReflow } from "./textblock/reflow/service";
import type { QuireProseMirrorBlockContainerSource, QuireProseMirrorBlockInputOptions } from "./types";
export type { QuireTopLevelBlockInclusionPredicate, QuireProseMirrorBlockContainerSource, QuireProseMirrorBlockInputOptions } from "./types";
import type { QuireEditorState } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireLayoutDirtyRange } from "../../invalidation";
import { createQuireDocumentNodeId } from "../../invalidation/identity";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireBlockLayoutInput,
  QuireBlockTextFlowReflow
} from "../../layout/engine/block-types";
import { defineQuireLazyLayoutSignature } from "@quirekit/layout/block-flow";
import { collectQuireProseMirrorInlineSourceProducts } from "./inline";
import { resolveQuireMarkedHiddenText } from "./font";
import {
  createEstimatedBlockLayoutSignature,
  createTextblockLayoutSignature,
  resolveBlockCollectionCacheVariant,
  resolveTextblockMeasurementCacheVariant
} from "./block-layout-signature";
import { resolveQuireTextblockShapingSource } from "./textblock/source";
import { projectTextblockSourceOptions, projectTextblockShapeSource } from "./textblock/shaping/source-options";
import {
  createTextblockCapabilityRecord,
  createTextblockCapabilityRevalidator,
  recordTextblockCapabilities
} from "./textblock/capability-reuse";
import type { QuireTextblockCapabilityResolution } from "../../layout/cache/block/types";
import {
  applyQuireParagraphDecorationInlineGeometry,
  resolveQuireParagraphDecoration,
  resolveQuireParagraphDecorationBlockInsets
} from "./textblock/decoration";
import {
  createTextblockFlowReflow,
  shapeTextblockFragments,
  tryShapeTextblockFragmentsFromRetainedTail
} from "./textblock/shape";
import {
  resolveQuireTextblockCharacterPitch,
  resolveQuireTextblockIndentationGeometry
} from "./textblock/indentation";
import {
  alignWordNumberingMarkerToFirstLine,
  resolveQuireTextblockMarkerBodyGeometry
} from "./textblock/numbering/marker/geometry";
import { createWordNumberingMarkerFragment } from "./textblock/numbering/marker/fragment";
import { createWordNumberingMarkerProducts } from "./textblock/numbering/marker/products";
import { resolveFirstLineMetrics } from "./textblock/numbering/marker/metrics";
import type {
  QuireParagraphAlignment,
  QuireParagraphFormatting,
  QuireParagraphModelProfile
} from "../../document-profile/types";
import { quireNeutralDocumentProfile } from "../../document-profile/defaults";
import { resolveQuireDocumentBlockInputOptions, resolveNestedBlockInputOptions } from "./document-authorities";
import {
  resolveQuireLineGridMetrics,
  resolveQuireLineGridParticipation
} from "./textblock/document-grid";
import {
  resolveQuireNaturalRunGlyphMetrics,
  resolveQuireParagraphMarkMetricSample
} from "./textblock/natural-line-metrics";

/**
 * Converts top-level ProseMirror document children into block layout inputs.
 *
 * @param options - Editor state and local measurement options.
 * @returns Block layout inputs in document order.
 */
export function collectQuireProseMirrorBlockInputs(
  options: QuireProseMirrorBlockInputOptions
): readonly QuireBlockLayoutInput[] {
  const resolvedOptions = resolveQuireDocumentBlockInputOptions(options);
  return collectChildBlockInputs({
    node: resolvedOptions.state.doc,
    contentStart: 0,
    path: [],
    options: resolvedOptions,
    ...(resolvedOptions.maxBlocks === undefined ? {} : { maxBlocks: resolvedOptions.maxBlocks }),
    ...(resolvedOptions.maxShapedBlockExtent === undefined
      ? {}
      : { maxShapedBlockExtent: resolvedOptions.maxShapedBlockExtent })
  });
}

/**
 * Converts one nested ProseMirror container into block layout inputs.
 *
 * The caller supplies absolute source positions and the structural path, so
 * auxiliary stories retain normal transaction ranges while using the same
 * shaping and provider services as body flow.
 *
 * @param source - Nested source container, absolute content start, and path.
 * @param options - Editor state and local measurement options.
 * @returns Block layout inputs in container order.
 */
export function collectQuireProseMirrorContainerBlockInputs(
  source: QuireProseMirrorBlockContainerSource,
  options: QuireProseMirrorBlockInputOptions
): readonly QuireBlockLayoutInput[] {
  const resolvedOptions = resolveQuireDocumentBlockInputOptions(options);
  return collectChildBlockInputs({
    node: source.node,
    contentStart: source.contentStart,
    path: source.path,
    options: resolvedOptions
  });
}

/**
 * Collects block inputs for one ProseMirror container.
 *
 * @param request - Container node, absolute content start, path, and conversion options.
 * @returns Child block inputs for the container.
 */
function collectChildBlockInputs(request: {
  readonly node: ProseMirrorNode;
  readonly contentStart: number;
  readonly path: readonly number[];
  readonly options: QuireProseMirrorBlockInputOptions;
  readonly maxBlocks?: number | undefined;
  readonly maxShapedBlockExtent?: number | undefined;
}): readonly QuireBlockLayoutInput[] {
  const inputs: QuireBlockLayoutInput[] = [];
  const pathStack = [...request.path];
  const topLevelCacheable =
    request.path.length === 0 &&
    request.options.blockShapeCache !== undefined &&
    request.options.wordNumberingMarkers?.size === 0;
  const topLevelNodes: ProseMirrorNode[] = [];
  const topLevelStarts: number[] = [];
  const topLevelCacheVariant = resolveBlockCollectionCacheVariant(
    request.options
  );
  let topLevelTextblockInputHits = 0;
  let shapedBlockExtent = 0;
  // Extents only feed the viewport-first cap; reading them would materialize
  // lazily relocated fragments for every block of an uncapped collection.
  const tracksShapedBlockExtent = request.maxShapedBlockExtent !== undefined;

  request.node.forEach(
    /**
     * Converts one child node when it can participate in block layout.
     *
     * @param child - ProseMirror child node.
     * @param offset - Child offset relative to the parent content.
     * @param index - Child index inside the parent.
     */
    (child, offset, index): void => {
      if (!child.isBlock) {
        return;
      }
      if (
        request.path.length === 0
        && request.options.includeTopLevelBlock?.(child, index) === false
      ) {
        return;
      }

      // Path ids are read synchronously by block builders. Reusing one stack
      // avoids allocating a fresh path array for every block during repeat input.
      pathStack.push(index);

      // Past the viewport-first window, estimate the block's height without
      // shaping it: it still occupies the document structure (page flow + scroll
      // height) so the snapshot stays whole, and is re-shaped when scrolled in.
      try {
        const from = request.contentStart + offset;
        const blockIndex = inputs.length;
        const range = { from, to: from + child.nodeSize };
        const forceShape = shouldShapeBlockPastMaxBlocks({
          range,
          options: request.options
        });

        if (topLevelCacheable) {
          topLevelNodes.push(child);
          topLevelStarts.push(from);

          const cached = request.options.blockShapeCache?.getTopLevelBlockInput(
            child,
            blockIndex,
            from,
            request.options.width,
            request.maxBlocks,
            request.maxShapedBlockExtent,
            topLevelCacheVariant,
            (source) => rebindCachedTextblockFlow({
              node: child, from, path: pathStack, options: request.options
            }, source)
          );

          if (cached !== undefined && (!forceShape || cached.estimated !== true)) {
            if (child.isTextblock) {
              topLevelTextblockInputHits += 1;
            }
            inputs.push(cached);
            if (tracksShapedBlockExtent) shapedBlockExtent += resolveBlockInputExtent(cached);
            return;
          }
        }

        if (isPastViewportFirstShapeWindow({
          blockIndex: inputs.length,
          shapedBlockExtent,
          maxBlocks: request.maxBlocks,
          maxShapedBlockExtent: request.maxShapedBlockExtent
        })) {
          const retainedInput = tryBuildRetainedTextblockInputPastMaxBlocks({
            node: child,
            from,
            path: pathStack,
              options: request.options
            });

          if (retainedInput !== undefined) {
            inputs.push(retainedInput);
            if (tracksShapedBlockExtent) shapedBlockExtent += resolveBlockInputExtent(retainedInput);
            return;
          }

          const offWindowInput = forceShape ? buildBlockInput({
              node: child,
              from,
              path: pathStack,
              options: request.options
            }) : buildEstimatedBlockInput({
              node: child,
              from,
              path: pathStack,
              options: request.options
            });
          inputs.push(offWindowInput);
          if (tracksShapedBlockExtent) shapedBlockExtent += resolveBlockInputExtent(offWindowInput);
          return;
        }

        const input = buildBlockInput({
          node: child,
          from,
          path: pathStack,
          options: request.options
        });
        inputs.push(input);
        if (tracksShapedBlockExtent) shapedBlockExtent += resolveBlockInputExtent(input);
      } finally {
        pathStack.pop();
      }
    }
  );
  if (topLevelTextblockInputHits > 0) {
    request.options.blockShapeCache?.recordTextblockTailBypass(
      "top-level-input-hit",
      topLevelTextblockInputHits
    );
  }

  if (
    topLevelCacheable
    && inputs.every((input) => !hasQuireBlockInputFlowExclusionGap(input))
  ) {
    request.options.blockShapeCache?.setTopLevelBlockInputs(
      request.options.width,
      request.maxBlocks,
      request.maxShapedBlockExtent,
      topLevelNodes,
      topLevelStarts,
      inputs,
      topLevelCacheVariant
    );
  }

  return inputs;
}

/**
 * Reports whether a top-level block belongs outside the exact shaping window.
 *
 * @param request - Current block index, accumulated extent, and active caps.
 * @returns Whether this block should use the off-window estimate path.
 */
function isPastViewportFirstShapeWindow(request: {
  readonly blockIndex: number;
  readonly shapedBlockExtent: number;
  readonly maxBlocks?: number | undefined;
  readonly maxShapedBlockExtent?: number | undefined;
}): boolean {
  return (
    (request.maxBlocks !== undefined && request.blockIndex >= request.maxBlocks) ||
    (request.maxShapedBlockExtent !== undefined &&
      request.shapedBlockExtent >= request.maxShapedBlockExtent)
  );
}

/**
 * Resolves the vertical extent represented by one block input for windowing.
 *
 * Exact text inputs use their shaped fragment bottoms; estimated and structured
 * inputs fall back to their declared minimum height. This keeps the decision
 * cheap while allowing long paragraphs to consume more of the viewport window
 * than one-line blocks.
 *
 * @param input - Collected block input.
 * @returns Non-negative local block extent in CSS pixels.
 */
function resolveBlockInputExtent(input: QuireBlockLayoutInput): number {
  const textExtent = input.textFragments?.reduce(
    (extent, fragment) => Math.max(extent, fragment.rect.y + fragment.rect.height),
    0
  ) ?? 0;

  return Math.max(0, input.minHeight ?? 0, textExtent);
}

/**
 * Builds an estimated, un-shaped block input from the node's content size and
 * the content width. Used for blocks outside the viewport-first window: the
 * estimate keeps page flow and scroll height roughly correct until the block is
 * shaped.
 *
 * @param request - Node, absolute start position, path, and conversion options.
 * @returns An estimated block layout input with no text fragments.
 */
function buildEstimatedBlockInput(request: {
  readonly node: ProseMirrorNode;
  readonly from: number;
  readonly path: readonly number[];
  readonly options: QuireProseMirrorBlockInputOptions;
}): QuireBlockLayoutInput {
  const id = createQuireDocumentNodeId(request.node, request.path);
  const range = { from: request.from, to: request.from + request.node.nodeSize };
  const contentStart = range.from + 1;
  const measurementCacheVariant = resolveTextblockMeasurementCacheVariant(
    request.node,
    request.options
  );
  const cachedInput = request.node.isTextblock
    ? request.options.blockShapeCache?.getTextblockInput(
        request.node,
        request.options.width,
        id,
        contentStart,
        measurementCacheVariant,
        (source) => rebindCachedTextblockFlow(request, source),
        createTextblockCapabilityRevalidator(request.options.sourceCapabilityRegistry, contentStart)
      )
    : undefined;

  if (cachedInput !== undefined) {
    request.options.blockShapeCache?.recordTextblockTailBypass(
      "textblock-input-hit"
    );
    return cachedInput;
  }

  const paragraphModel = request.options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  const paragraphFormatting = paragraphModel.resolveParagraph(
    request.node,
    request.options.paragraphStyleContext ?? paragraphModel.styleContext(request.options.state.doc),
    request.options.wordTableCellStyleLayer
  );
  const estimatedMetrics = resolveEstimatedTextblockMetrics(request.options, paragraphFormatting, paragraphModel);
  const lineHeight = estimatedMetrics.lineHeight;
  const fontSizePx = parseFontSizePx(request.options.font) ?? lineHeight * 0.7;
  const avgCharWidth = Math.max(1, fontSizePx * 0.5);
  const charsPerLine = Math.max(1, Math.floor(request.options.width / avgCharWidth));
  const lines = Math.max(
    1,
    Math.ceil(resolveEstimatedTextblockLength(request.node, request.options) / charsPerLine)
  );
  const sourceProducts = request.node.isTextblock
    ? collectQuireProseMirrorInlineSourceProducts({
        node: request.node,
        contentStart,
        contentEnd: Math.max(range.to - 1, contentStart),
        sourceId: id,
        ...(request.options.sourceCapabilityRegistry === undefined
          ? {}
          : { sourceCapabilityRegistry: request.options.sourceCapabilityRegistry })
      })
    : { sourceAnchors: [], sourceCapabilities: [] };
  const pagination = request.node.isTextblock ? paragraphFormatting.pagination : undefined;
  const legacyDirection: unknown = request.node.attrs.dir;
  const paragraphDirection = paragraphFormatting.direction
    ?? (
      legacyDirection === "ltr" || legacyDirection === "rtl"
        ? legacyDirection
        : "auto"
    );
  const paragraphDecoration = request.node.isTextblock
    ? applyQuireParagraphDecorationInlineGeometry(
        resolveQuireParagraphDecoration(
          paragraphFormatting,
          paragraphDirection
        ),
        resolveQuireTextblockIndentationGeometry(
          request.node,
          request.options.width,
          paragraphDirection,
          {
            indentation: paragraphFormatting.indentation,
            characterPitch: resolveQuireTextblockCharacterPitch(request.options.font),
            characterGrid: request.options.characterGrid,
            paragraphModel: request.options.paragraphModel
          }
        )
      )
    : undefined;
  const input = {
    id,
    range,
    minHeight: lines * lineHeight,
    ...(estimatedMetrics.spacingBefore === 0
      ? {}
      : { spacingBefore: estimatedMetrics.spacingBefore }),
    ...(estimatedMetrics.spacingAfter === 0
      ? {}
      : { spacingAfter: estimatedMetrics.spacingAfter }),
    ...resolveQuireParagraphDecorationBlockInsets(paragraphDecoration),
    layoutSignature: createEstimatedBlockLayoutSignature(
      lines,
      lineHeight,
      sourceProducts.sourceAnchors,
      sourceProducts.sourceCapabilities,
      contentStart
    ),
    sourceAnchors: sourceProducts.sourceAnchors,
    sourceCapabilities: sourceProducts.sourceCapabilities,
    ...(paragraphDecoration === undefined
      ? {}
      : { paragraphDecoration }),
    ...(pagination === undefined ? {} : { pagination }),
    estimated: true
  };

  if (request.node.isTextblock) {
    request.options.blockShapeCache?.recordTextblockTailBypass("estimated");
    request.options.blockShapeCache?.setTextblockInput(
      request.node,
      request.options.width,
      id,
      contentStart,
      input,
      measurementCacheVariant
    );
  }

  return input;
}

/**
 * Resolves paragraph-owned metrics without collecting or shaping inline runs.
 *
 * @param options - Base line metrics used by the estimate path.
 * @param paragraph - Effective paragraph formatting shared with exact shaping.
 * @param paragraphModel - Paragraph semantics resolving line metrics and spacing.
 * @returns Line height plus paragraph before/after spacing in CSS pixels.
 */
function resolveEstimatedTextblockMetrics(
  options: QuireProseMirrorBlockInputOptions,
  paragraph: QuireParagraphFormatting,
  paragraphModel: QuireParagraphModelProfile
): {
  readonly lineHeight: number;
  readonly spacingBefore: number;
  readonly spacingAfter: number;
} {
  const gridParticipation = resolveQuireLineGridParticipation(
    paragraph,
    options.lineGrid,
    options.insideWordTableCell
  );
  const naturalMetrics = !paragraph.naturalLineMetrics && gridParticipation === null
    ? null
    : resolveQuireNaturalRunGlyphMetrics(
      [],
      options.font,
      options.textMeasurer,
      resolveQuireParagraphMarkMetricSample(paragraph.markTypography?.fontFamily)
    );
  const lineMetrics = paragraphModel.lineMetrics(
    paragraph,
    naturalMetrics?.lineHeight ?? options.lineHeight,
    naturalMetrics?.baselineOffset ?? options.textBaselineOffset
  );
  const resolvedLineMetrics = gridParticipation === null
    ? lineMetrics
    : resolveQuireLineGridMetrics({
        naturalMetrics: {
          font: options.font,
          lineHeight: options.lineHeight,
          baselineOffset: options.textBaselineOffset,
          lineHeightMode: "minimum"
        },
        runs: [],
        textMeasurer: options.textMeasurer,
        ...(naturalMetrics === null ? {} : { naturalGlyphMetrics: naturalMetrics }),
        participation: gridParticipation
      });
  const blockSpacing = paragraphModel.blockSpacing(paragraph, resolvedLineMetrics.lineHeight);

  return {
    lineHeight: resolvedLineMetrics.lineHeight,
    spacingBefore: blockSpacing.before,
    spacingAfter: blockSpacing.after
  };
}

/**
 * Resolves a cheap textblock length estimate without materializing
 * `node.textContent`.
 *
 * For plain text paragraphs, ProseMirror content size is the text length. For
 * inline leaf nodes it is still a conservative placeholder count, which is fine
 * for an off-window height estimate that is replaced by real shaping when the
 * block enters the active window.
 *
 * @param node - ProseMirror block node to estimate.
 * @param options - Active style resolver and hidden-text view policy.
 * @returns Approximate text length used for line-count estimation.
 */
function resolveEstimatedTextblockLength(
  node: ProseMirrorNode,
  options: QuireProseMirrorBlockInputOptions
): number {
  if ((options.hiddenTextViewMode ?? "normal") === "formatting-inspection") {
    return Math.max(0, node.content.size);
  }

  let length = 0;
  node.descendants((child) => {
    if (child.isText && typeof child.text === "string") {
      if (resolveQuireMarkedHiddenText(
        child.marks,
        options.resolveMarkQuireStyle
      ) !== true) {
        length += child.text.length;
      }
      return false;
    }
    if (child.isInline && child.isLeaf) {
      length += 1;
    }
    return true;
  });
  return length;
}

/**
 * Tries to materialize a dirty off-window textblock from retained tail fragments.
 *
 * Viewport-first collection normally estimates blocks after `maxBlocks`. For a
 * focused edit inside a previously shaped huge paragraph, however, the retained
 * tail-shape cache can update the paragraph locally without reopening the whole
 * suffix. This bridge uses that retained-only path and falls back to the normal
 * estimate whenever the proof is unavailable.
 *
 * @param request - Node, absolute start position, path, and conversion options.
 * @returns A real textblock input from retained local reuse, or undefined.
 */
function tryBuildRetainedTextblockInputPastMaxBlocks(request: {
  readonly node: ProseMirrorNode;
  readonly from: number;
  readonly path: readonly number[];
  readonly options: QuireProseMirrorBlockInputOptions;
}): QuireBlockLayoutInput | undefined {
  if (
    !request.node.isTextblock ||
    request.options.blockShapeCache === undefined ||
    request.options.wordNumberingMarkers?.has(request.from) === true
  ) {
    return undefined;
  }

  const range = { from: request.from, to: request.from + request.node.nodeSize };
  const contentStart = range.from + 1;
  const contentEnd = Math.max(range.to - 1, contentStart);

  if (!doesDirtyRangeTouchTextblock(request.options.layoutDirtyRange, range)) {
    return undefined;
  }

  if (
    !doesDirtyRangeTextEditTouchTextblock(
      request.options.layoutDirtyRange,
      contentStart,
      contentEnd
    )
  ) {
    return undefined;
  }

  const id = createQuireDocumentNodeId(request.node, request.path);
  const measurementCacheVariant = resolveTextblockMeasurementCacheVariant(
    request.node,
    request.options
  );
  if (
    !request.options.blockShapeCache.hasTextblockTailShapeCandidate(
      id,
      request.options.width,
      contentStart
    )
  ) {
    return undefined;
  }

  const source = resolveQuireTextblockShapingSource(projectTextblockSourceOptions(
    { node: request.node, contentStart, contentEnd, sourceId: id }, request.options
  ));
  const characterPitch = resolveQuireTextblockCharacterPitch(source.metrics.font, source.runs);
  const indentationGeometry = resolveQuireTextblockIndentationGeometry(
    request.node,
    request.options.width,
    source.baseDirection,
    {
      indentation: source.paragraphFormatting.indentation,
      characterPitch,
      characterGrid: request.options.characterGrid,
      paragraphModel: request.options.paragraphModel
    }
  );
  const paragraphDecoration = applyQuireParagraphDecorationInlineGeometry(
    source.paragraphDecoration,
    indentationGeometry
  );
  const textFragments = tryShapeTextblockFragmentsFromRetainedTail({
    node: request.node,
    options: request.options,
    id,
    ...projectTextblockShapeSource(source),
    contentStart,
    contentEnd,
    cacheVariant: measurementCacheVariant,
    characterPitch,
    indentationGeometry
  });

  if (textFragments === undefined) {
    return undefined;
  }

  const input: QuireBlockLayoutInput = {
    id,
    range,
    minHeight: source.metrics.lineHeight,
    ...(source.blockSpacing.before === 0
      ? {}
      : { spacingBefore: source.blockSpacing.before }),
    ...(source.blockSpacing.after === 0
      ? {}
      : { spacingAfter: source.blockSpacing.after }),
    ...resolveQuireParagraphDecorationBlockInsets(paragraphDecoration),
    ...(source.pagination === undefined
      ? {}
      : { pagination: source.pagination }),
    ...(paragraphDecoration === undefined
      ? {}
      : { paragraphDecoration }),
    textRuns: source.runs,
    sourceAnchors: source.sourceAnchors,
    sourceCapabilities: source.sourceCapabilities,
    textFragments
  };
  defineQuireLazyLayoutSignature(input, () =>
    createTextblockLayoutSignature(
      textFragments,
      source.sourceAnchors,
      source.sourceCapabilities,
      contentStart
    )
  );
  request.options.blockShapeCache.setTextblockInput(
    request.node,
    request.options.width,
    id,
    contentStart,
    input,
    measurementCacheVariant
  );

  return input;
}

/**
 * Checks whether the dirty range carries a precise text edit for a textblock.
 *
 * The retained off-window bridge intentionally avoids string-diff fallback for
 * broad dirty ranges. Without a `textEdit` hint, collecting a huge off-window
 * paragraph just to prove that local reuse is unsafe can be more expensive than
 * keeping the block estimated for the current frame.
 *
 * @param dirtyRange - Dirty range derived from the triggering transactions.
 * @param contentStart - Absolute document position at the start of block content.
 * @param contentEnd - Absolute document position at the end of block content.
 * @returns Whether retained local textblock reuse has a precise edit anchor.
 */
function doesDirtyRangeTextEditTouchTextblock(
  dirtyRange: QuireLayoutDirtyRange | null | undefined,
  contentStart: number,
  contentEnd: number
): boolean {
  const textEdit = dirtyRange?.reason === "content" ? dirtyRange.textEdit : undefined;

  return (
    textEdit !== undefined &&
    textEdit.from >= contentStart &&
    textEdit.from <= contentEnd
  );
}

/**
 * Checks whether the current dirty range targets a candidate textblock.
 *
 * @param dirtyRange - Dirty range derived from the triggering transactions.
 * @param range - Textblock document range.
 * @returns Whether retained off-window shaping should be attempted.
 */
function doesDirtyRangeTouchTextblock(
  dirtyRange: QuireLayoutDirtyRange | null | undefined,
  range: QuireBlockLayoutInput["range"]
): boolean {
  if (
    dirtyRange === null ||
    dirtyRange === undefined ||
    dirtyRange.reason !== "content"
  ) {
    return false;
  }

  if (dirtyRange.changedRange.from === dirtyRange.changedRange.to) {
    return (
      dirtyRange.changedRange.from >= range.from &&
      dirtyRange.changedRange.from <= range.to
    );
  }

  return (
    dirtyRange.changedRange.from < range.to &&
    dirtyRange.changedRange.to > range.from
  );
}

/**
 * Reports whether a top-level block past the viewport-first prefix must still be
 * shaped in the current pass.
 *
 * Windowed first paint is prefix-based, but focused input may happen in a block
 * that is already visible after a programmatic scroll or user scroll. The active
 * selection head is the narrowest safe exception: it keeps the active caret
 * block real without turning broad selections into full-document shaping.
 *
 * @param request - Block range and collection options for the current pass.
 * @returns Whether the block should be shaped even after `maxBlocks`.
 */
function shouldShapeBlockPastMaxBlocks(request: {
  readonly range: QuireBlockLayoutInput["range"];
  readonly options: QuireProseMirrorBlockInputOptions;
}): boolean {
  const selection = request.options.state.pm.selection;
  const { range } = request;
  if (selection === undefined) {
    return false;
  }

  const head = readSelectionHeadPosition(selection);

  return head >= range.from && head <= range.to;
}

/**
 * Reads the active head position from a ProseMirror selection.
 *
 * ProseMirror's base `Selection` always has `from`/`to`; text selections also
 * expose `head`/`$head`. Falling back to `to` keeps node and all selections
 * deterministic without forcing every touched block into the shape window.
 *
 * @param selection - ProseMirror selection to inspect.
 * @returns Active head position used for viewport-first focus inclusion.
 */
function readSelectionHeadPosition(selection: QuireEditorState["pm"]["selection"]): number {
  const head = (selection as { readonly head?: unknown }).head;
  if (typeof head === "number" && Number.isFinite(head)) {
    return head;
  }

  const resolvedHead = (selection as { readonly $head?: { readonly pos?: unknown } }).$head
    ?.pos;
  if (typeof resolvedHead === "number" && Number.isFinite(resolvedHead)) {
    return resolvedHead;
  }

  return selection.to;
}

/**
 * Parses the pixel size from a CSS font shorthand (e.g. `"16px serif"`).
 *
 * @param font - CSS font shorthand.
 * @returns The pixel size, or undefined when none is present.
 */
function parseFontSizePx(font: string): number | undefined {
  const match = /(\d+(?:\.\d+)?)px/u.exec(font);
  return match ? Number(match[1]) : undefined;
}

/**
 * Binds a moved native service to this collector's current absolute source.
 *
 * The path stack belongs to synchronous traversal, so copy it only after a
 * shifted cache hit actually asks for a service. Reading the service remains
 * cheap; only a real sibling/field reflow reopens source collection.
 * @param request - Current immutable node, absolute position, and collection options.
 * @param source - Previous service whose native ownership must be proven.
 * @returns Lazy current-source service, or undefined for a provider/unknown source.
 */
function rebindCachedTextblockFlow(
  request: {
    readonly node: ProseMirrorNode;
    readonly from: number;
    readonly path: readonly number[];
    readonly options: QuireProseMirrorBlockInputOptions;
  },
  source: QuireBlockTextFlowReflow
): QuireBlockTextFlowReflow | undefined {
  if (!request.node.isTextblock
    || request.options.layoutProviderRegistry.resolve(request.node.type.name) !== undefined
    || request.options.wordNumberingMarkers?.has(request.from) === true) return undefined;
  const { node, from, options } = request;
  const path = [...request.path];
  return rebindNativeTextblockReflow(source, () => buildBlockInput({
    node, from, path,
    options: { ...options, trace: undefined },
    reuseTextblockInput: false
  }).textFlowReflow);
}

/**
 * Converts one ProseMirror block node into a block layout input.
 *
 * @param request - Node, absolute start position, path, and conversion options.
 * @returns Block layout input for the node.
 */
function buildBlockInput(request: {
  readonly node: ProseMirrorNode;
  readonly from: number;
  readonly path: readonly number[];
  readonly options: QuireProseMirrorBlockInputOptions;
  /** Whether this invocation may return a complete cached input. */
  readonly reuseTextblockInput?: boolean | undefined;
}): QuireBlockLayoutInput {
  const id = createQuireDocumentNodeId(request.node, request.path);
  const range = { from: request.from, to: request.from + request.node.nodeSize };

  const layoutProvider = request.options.layoutProviderRegistry.resolve(
    request.node.type.name
  );
  if (layoutProvider !== undefined) {
    return {
      id,
      range,
      minHeight: request.options.lineHeight,
      layoutProvider: {
        provider: layoutProvider,
        snapshotVersion: request.options.snapshotVersion,
        sourceKind: request.node.type.name,
        sourceIdentity: request.node,
        sourcePath: [...request.path],
        sourceContentStart: range.from + 1,
        collectBlockInputs: (childRequest) => collectChildBlockInputs({
          node: childRequest.sourceIdentity as ProseMirrorNode,
          contentStart: childRequest.contentStart,
          path: childRequest.path,
          options: resolveNestedBlockInputOptions(
            request.node,
            childRequest.lineBreakMode === undefined
              ? request.options
              : { ...request.options, lineBreakMode: childRequest.lineBreakMode },
            childRequest.inlineSize,
            childRequest.path
          )
        })
      }
    };
  }

  if (request.node.isTextblock) {
    const contentStart = range.from + 1;
    const contentEnd = Math.max(range.to - 1, contentStart);
    const wordNumberingMarker = request.options.wordNumberingMarkers?.get(request.from);
    const measurementCacheVariant = resolveTextblockMeasurementCacheVariant(
      request.node,
      request.options
    );
    // A preceding paragraph can change a generated counter without changing
    // this node's identity, so numbered paragraphs bypass the input cache. Their
    // body shape is keyed by the marker-adjusted indentation and line metrics.
    const cachedInput = wordNumberingMarker === undefined && request.reuseTextblockInput !== false
      ? request.options.blockShapeCache?.getTextblockInput(
      request.node,
      request.options.width,
      id,
      contentStart,
      measurementCacheVariant,
      (source) => rebindCachedTextblockFlow(request, source),
      createTextblockCapabilityRevalidator(request.options.sourceCapabilityRegistry, contentStart)
      )
      : undefined;

    if (cachedInput !== undefined && cachedInput.estimated !== true) {
      request.options.blockShapeCache?.recordTextblockTailBypass(
        "textblock-input-hit"
      );
      return cachedInput;
    }

    const capabilityResolutions: QuireTextblockCapabilityResolution[] = [];
    const source = resolveQuireTextblockShapingSource(projectTextblockSourceOptions(
      { node: request.node, contentStart, contentEnd, sourceId: id },
      recordTextblockCapabilities(request.options, capabilityResolutions)
    ));
    // The editor preserves every typed space (Word/Docs/Notion-like): runs of
    // spaces — leading, between words, or trailing — stay in the layout so each
    // advances the caret and renders. PM already normalizes whitespace when it
    // parses imported HTML, so a normal paragraph only holds the spaces a user
    // typed; re-collapsing them here would drop just-typed content. Spaces stay
    // soft-wrap opportunities, so word-boundary wrapping is unaffected.
    // Honor an explicit `dir` node attribute — the same attribute Tiptap's
    // TextDirection extension sets — falling back to auto-detection otherwise.
    // An empty textblock has no runs; still emit one zero-width caret-anchor
    // fragment (block-relative, translated to absolute later) so the caret can
    // sit on the blank line and vertical navigation does not skip it. The inline
    // layout only anchors empty *wrapped* lines, never an empty paragraph.
    const characterPitch = resolveQuireTextblockCharacterPitch(source.metrics.font, source.runs);
    /**
     * Projects each indentation authority through the same paragraph-local space.
     * @param indentation - Effective paragraph or original numbering-level values.
     * @param reserveFirstLineForMarker - Whether the marker owns first-line indentation.
     * @returns Physical body interval before collision handling.
     */
    const projectIndentation = (indentation: unknown, reserveFirstLineForMarker = false) =>
      resolveQuireTextblockIndentationGeometry(request.node, request.options.width, source.baseDirection,
        { indentation, characterPitch, characterGrid: request.options.characterGrid,
          reserveFirstLineForMarker, paragraphModel: request.options.paragraphModel });
    const baseIndentationGeometry = projectIndentation(
      wordNumberingMarker?.indentation ?? source.paragraphFormatting.indentation,
      wordNumberingMarker !== undefined
    );
    const markerPlan = wordNumberingMarker === undefined
      ? undefined
      : createWordNumberingMarkerFragment({
          id,
          marker: wordNumberingMarker,
          collisionPolicy: request.options.listMarkerCollision,
          contentStart,
          geometry: baseIndentationGeometry,
          paragraphWidth: request.options.width,
          font: source.numberingMarkerInheritanceFont,
          inheritedTextColor: source.numberingMarkerInheritanceColor,
          inheritedTextDecoration:
            source.numberingMarkerInheritanceDecoration,
          documentFontTheme: request.options.documentFontTheme,
          lineHeight: source.metrics.lineHeight,
          baseline: source.metrics.baselineOffset,
          baseDirection: source.baseDirection,
          characterPitch,
          paragraphModel: request.options.paragraphModel,
          textMeasurer: request.options.textMeasurer
        });
    // Effective indentation owns requested paragraph flow, while the original
    // numbering-level geometry remains the imported rebound authority. Keeping
    // both projections prevents direct zero formatting from erasing the level
    // body stop needed only by the optional Word-compatible collision policy.
    const levelIndentationGeometry = wordNumberingMarker === undefined
      ? undefined
      : projectIndentation(wordNumberingMarker.levelIndentation, true);
    const indentationGeometry = markerPlan === undefined
      ? baseIndentationGeometry
      : resolveQuireTextblockMarkerBodyGeometry({
          geometry: baseIndentationGeometry,
          markerX: markerPlan.fragment.rect.x,
          markerWidth: markerPlan.fragment.rect.width,
          suffixAdvance: markerPlan.suffixAdvance,
          collisionPolicy: request.options.listMarkerCollision,
          levelBodyStartX: source.baseDirection === "rtl"
            ? (levelIndentationGeometry?.x ?? 0)
              + (levelIndentationGeometry?.width ?? request.options.width)
            : levelIndentationGeometry?.x ?? 0,
          baseDirection: source.baseDirection
        });
    const decorationIndentationGeometry = wordNumberingMarker === undefined
      ? baseIndentationGeometry
      : projectIndentation(wordNumberingMarker.indentation);
    const paragraphDecoration = applyQuireParagraphDecorationInlineGeometry(
      source.paragraphDecoration,
      decorationIndentationGeometry
    );
    const shapeRequest = {
      node: request.node,
      options: request.options,
      id,
      ...projectTextblockShapeSource(source),
      contentStart,
      contentEnd,
      cacheVariant: measurementCacheVariant,
      characterPitch,
      indentationGeometry,
      ...(markerPlan?.firstLineAscent === undefined
        ? {}
        : { lineMetricContributions: [{ ascent: markerPlan.firstLineAscent }] }),
      ...(source.finalLineMetricContribution === undefined
        ? {}
        : { finalLineMetricContribution: source.finalLineMetricContribution }),
      ...(wordNumberingMarker === undefined
        ? {}
        : { wordNumberingMarker })
    };
    const emptyLineMetrics = resolveFirstLineMetrics(
      source.metrics.lineHeight,
      source.metrics.baselineOffset,
      source.metrics.lineHeightMode === "exact"
        ? undefined
        : markerPlan?.firstLineAscent
    );
    const shapeResult =
      source.runs.length === 0
        ? {
            fragments: [{
              id: `${id}:text-0`,
              text: "",
              range: { from: contentStart, to: contentStart },
              rect: {
                x: resolveEmptyTextblockX(
                  indentationGeometry.firstLineX,
                  indentationGeometry.firstLineWidth,
                  source.alignment,
                  source.baseDirection
                ),
                y: 0,
                width: 0,
                height: emptyLineMetrics.height
              },
              font: request.options.font,
              lineHeight: emptyLineMetrics.height,
              ...(source.metrics.lineHeightMode === "exact" ? { clipToLine: true } : {}),
              baseline: emptyLineMetrics.ascent,
              caretStops: [{ position: { pos: contentStart, bias: 1 }, localX: 0 }]
            } satisfies QuireTextFragment],
            flowExclusions: [],
            flowExclusionGaps: []
          }
        : shapeTextblockFragments(shapeRequest);
    const markerFragment = markerPlan === undefined
      ? undefined
      : alignWordNumberingMarkerToFirstLine(
          markerPlan.fragment, shapeResult.fragments, markerPlan.baselineShift);
    const textFragments = markerFragment === undefined
      ? shapeResult.fragments
      : [markerFragment, ...shapeResult.fragments];
    const markerProducts = markerFragment === undefined || wordNumberingMarker === undefined
      ? undefined
      : createWordNumberingMarkerProducts({
          id,
          sourceKind: request.node.type.name,
          range,
          marker: markerFragment.text === wordNumberingMarker.text
            ? wordNumberingMarker
            : { ...wordNumberingMarker, text: markerFragment.text },
          fragment: markerFragment,
          bodyStartX: indentationGeometry.firstLineX,
          paragraphModel: request.options.paragraphModel
        });
    const textFlowReflow = source.runs.length === 0
      ? undefined
      : createTextblockFlowReflow(shapeRequest);

    const input: QuireBlockLayoutInput = {
      id,
      range,
      inlineContentWidth: Math.min(indentationGeometry.firstLineWidth, indentationGeometry.width),
      minHeight: source.metrics.lineHeight,
      ...(source.blockSpacing.before === 0
        ? {}
        : { spacingBefore: source.blockSpacing.before }),
      ...(source.blockSpacing.after === 0
        ? {}
        : { spacingAfter: source.blockSpacing.after }),
      ...resolveQuireParagraphDecorationBlockInsets(paragraphDecoration),
      ...(source.pagination === undefined
        ? {}
        : { pagination: source.pagination }),
      ...(paragraphDecoration === undefined
        ? {}
        : { paragraphDecoration }),
      textRuns: source.runs,
      sourceAnchors: source.sourceAnchors,
      sourceCapabilities: source.sourceCapabilities,
      textFragments,
      ...(markerProducts === undefined ? {} : { regionProducts: markerProducts }),
      ...(shapeResult.flowExclusions.length === 0
        ? {}
        : { localFlowExclusions: shapeResult.flowExclusions }),
      ...(textFlowReflow === undefined
        ? {}
        : {
            textFlowReflow: markerFragment === undefined
              ? textFlowReflow
              : prependWordNumberingMarkerToReflow(
                  textFlowReflow,
                  markerFragment
                )
          }),
      ...(shapeResult.flowExclusionGaps.length === 0
        ? {}
        : { flowExclusionGaps: shapeResult.flowExclusionGaps })
    };
    defineQuireLazyLayoutSignature(input, () =>
      createTextblockLayoutSignature(
        textFragments,
        source.sourceAnchors,
        source.sourceCapabilities,
        contentStart
      )
    );

    if (
      wordNumberingMarker === undefined
      && shapeResult.flowExclusionGaps.length === 0
    ) {
      request.options.blockShapeCache?.setTextblockInput(
        request.node,
        request.options.width,
        id,
        contentStart,
        input,
        measurementCacheVariant,
        createTextblockCapabilityRecord(capabilityResolutions, input)
      );
    }

    return input;
  }

  return {
    id,
    range,
    minHeight: request.options.lineHeight,
    children: collectChildBlockInputs({
      node: request.node,
      contentStart: range.from + 1,
      path: request.path,
      options: resolveNestedBlockInputOptions(
        request.node,
        request.options,
        request.options.width,
        request.path
      )
    })
  };
}

/**
 * Resolves the caret origin for an empty paragraph under logical alignment.
 *
 * Empty paragraphs have no measured clusters from which to derive an occupied
 * width, so their zero-width caret is projected directly to the aligned edge.
 * Center uses the interval midpoint; logical start/end follow the explicit
 * paragraph direction, while auto direction defaults to left-to-right until
 * the user enters a strong character.
 *
 * @param x - Physical paragraph-row origin.
 * @param width - Available paragraph-row width.
 * @param alignment - Logical paragraph alignment.
 * @param baseDirection - Explicit or auto paragraph base direction.
 * @returns Physical x for the empty caret fragment.
 */
function resolveEmptyTextblockX(
  x: number,
  width: number,
  alignment: QuireParagraphAlignment,
  baseDirection: "ltr" | "rtl" | "auto"
): number {
  if (alignment === "center") return x + width / 2;
  const rtl = baseDirection === "rtl";
  if (alignment === "end") return rtl ? x : x + width;
  return rtl ? x + width : x;
}

/**
 * Keeps a generated marker attached when floating-object slots reshape the body.
 *
 * @param reflow - Canonical editable-body reflow service.
 * @param marker - Generated marker fragment used as the reflow template.
 * @returns Reflow service that prepends the marker to every accepted result.
 */
function prependWordNumberingMarkerToReflow(
  reflow: QuireBlockTextFlowReflow,
  marker: QuireTextFragment
): QuireBlockTextFlowReflow {
  return {
    lineHeight: reflow.lineHeight,
    reflow(lineSlots, slotSignature) {
      const result = reflow.reflow(lineSlots, slotSignature);
      const alignedMarker = alignWordNumberingMarkerToFirstLine(
        marker,
        result.textFragments
      );
      return {
        ...result,
        textFragments: [alignedMarker, ...result.textFragments]
      };
    },
    /**
     * Keeps the generated marker attached during occurrence-field reflow.
     *
     * @param replacements - Exact derived replacement extents.
     * @returns Fresh runs plus body fragments prefixed by the aligned marker.
     */
    reflowInlineReplacements(replacements) {
      const result = reflow.reflowInlineReplacements(replacements);
      const alignedMarker = alignWordNumberingMarkerToFirstLine(
        marker,
        result.textFragments
      );
      return {
        ...result,
        textFragments: [alignedMarker, ...result.textFragments]
      };
    }
  };
}

/**
 * Reports whether an input subtree carries a flow-exclusion failure.
 *
 * @param input - Recursive block input to inspect before cache admission.
 * @returns Whether the input or one of its descendants owns a failure.
 */
function hasQuireBlockInputFlowExclusionGap(
  input: QuireBlockLayoutInput
): boolean {
  return (
    (input.flowExclusionGaps?.length ?? 0) > 0
    || (input.children?.some((child) => hasQuireBlockInputFlowExclusionGap(child)) ?? false)
  );
}
