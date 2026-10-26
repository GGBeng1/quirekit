import {
  collectQuireProseMirrorBlockInputs,
  createQuireMarkStyleResolver,
  createQuireNodeTextStyleResolver,
  readQuireDocumentFontTheme,
  readQuireDocumentFontTable,
  resolveQuireDocumentFont,
  type QuireProseMirrorBlockInputOptions
} from "../prosemirror";
import { layoutQuireBlockDocument } from "../../layout/engine";
import type { QuireLayoutSnapshotViewGraphOptions } from "../../layout/types";
import type { QuireLayoutSnapshotOptions } from "../types";
import type { QuireLayoutDocument } from "../../layout/engine/types";
import { createQuireSnapshotLayoutProviderRegistry } from "../providers/registry";
import {
  createQuireInlineSourceCapabilityRegistry,
  createQuireDrawingObjectSourceCapabilityResolver
} from "../../layout/engine/inline/source-capability";
import { resolveQuireDocumentProfile } from "../../document-profile";
import {
  createQuireRetainedBlockLayoutGraph,
  type QuireRetainedBlockLayoutGraph
} from "../../layout/retained-block";
import { allocateQuireLayoutSnapshotViewGraphOptions } from "./authority";
import {
  blockGap,
  quireDefaultLayoutBlockHeight,
  quireDefaultLayoutFont,
  defaultLayoutTextMeasurer,
  quireDefaultLayoutLineBreakMode,
  quireDefaultLayoutTextBaselineOffset
} from "./constants";
import { traceQuireLayoutStage } from "./trace";
import { createQuireBodyFlowCallbacks } from "./sections/source-filter";
import {
  compileQuirePageBandStorySources,
  type QuirePageBandStorySourceLayout
} from "./page-bands";
import {
  compileQuireWordDrawingTextStorySources,
  type QuireWordDrawingTextStorySourceLayout
} from "./word-drawing-text";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import {
  compileQuirePageEndnoteSources,
  compileQuirePageFootnoteSources,
  type QuirePageEndnoteSourceLayout,
  type QuirePageFootnoteSourceLayout
} from "./page-notes";
import { doStoriesHoldTables, type QuireStorySourceBatch, type QuireStorySourceTable } from "./story-sources";

/** Infinite-flow layout plus view-graph authority allocated for one snapshot pass. */
export interface QuireInfiniteLayoutCompilation {
  /** Renderer-neutral block layout before page projection. */
  readonly document: QuireLayoutDocument;
  /** Canonical measured header/footer stories excluded from body pagination. */
  readonly pageBandSources: readonly QuirePageBandStorySourceLayout[];
  /** Canonical measured drawing-text stories excluded from body pagination. */
  readonly wordDrawingTextSources: readonly QuireWordDrawingTextStorySourceLayout[];
  /** Measured footnote bodies placed at the bottom of the page holding their reference. */
  readonly footnoteSources: readonly QuirePageFootnoteSourceLayout[];
  /** Measured end note bodies placed after the flow, present only for the flow ending the document. */
  readonly endnoteSources: readonly QuirePageEndnoteSourceLayout[];
  /** Canonical measurer shared by source and occurrence-specific field layout. */
  readonly textMeasurer: QuireTextMeasurer;
  /** View-graph version and performance contract owned by this pass. */
  readonly viewGraphOptions: QuireLayoutSnapshotViewGraphOptions;
}

/**
 * Compiles editor state into the canonical infinite-flow block document.
 *
 * This is the only phase allowed to execute live extension/provider callbacks.
 * Background pagination consumes its measured clone-safe output, never editor
 * state or retained graph objects.
 *
 * @param options - State, provider, shaping, and flow geometry inputs.
 * @param retainedBlockGraph - Optional retained graph owned by a mounted view.
 * @param sectionIndex - Optional original root index limiting this pass to one section.
 * @param endsDocument - Whether this flow ends the document and therefore carries the end notes.
 * @param occurrenceValues - Candidate source text for pagination convergence before shaping.
 * @param stories - Story sources shared with the other passes of the same build.
 * @returns Infinite document and its view-graph authority.
 */
export function compileQuireInfiniteLayoutDocument(
  options: QuireLayoutSnapshotOptions,
  retainedBlockGraph?: QuireRetainedBlockLayoutGraph,
  sectionIndex?: number,
  endsDocument = true,
  occurrenceValues?: ReadonlyMap<string, string>,
  stories?: QuireStorySourceTable
): QuireInfiniteLayoutCompilation {
  const { state, viewportRect } = options;
  const bodyRect = options.pageGeometry?.bodyRect ?? viewportRect;
  // Multi-column body text is measured once at the column width; page-band
  // stories keep the full body width.
  const columnWidth = options.pageGeometry?.columns?.measureWidth;
  const flowRect = columnWidth === undefined ? bodyRect : { ...bodyRect, width: columnWidth };
  const applyDocumentTheme = options.font === undefined;
  const documentFontTheme = applyDocumentTheme
    ? readQuireDocumentFontTheme(state.doc) ?? undefined
    : undefined;
  const documentFontTable = applyDocumentTheme
    ? readQuireDocumentFontTable(state.doc) ?? undefined
    : undefined;
  const font = options.font ?? resolveQuireDocumentFont(
    state.doc,
    quireDefaultLayoutFont,
    "body"
  );
  const textBaselineOffset = options.textBaselineOffset ?? quireDefaultLayoutTextBaselineOffset;
  const textMeasurer = options.textMeasurer ?? defaultLayoutTextMeasurer;
  const lineBreakMode = options.lineBreakMode ?? quireDefaultLayoutLineBreakMode;
  const viewGraphOptions = allocateQuireLayoutSnapshotViewGraphOptions();
  const activeRetainedBlockGraph =
    retainedBlockGraph ?? createQuireRetainedBlockLayoutGraph();
  activeRetainedBlockGraph.providerExecutionLifecycle.beginSnapshot(
    viewGraphOptions.version
  );
  try {
    options.blockShapeCache?.prepare({
      measurer: textMeasurer,
      font,
      lineHeight: quireDefaultLayoutBlockHeight,
      textBaselineOffset,
      lineBreakMode,
      lineBreakerName: options.lineBreaker?.name
    });
    activeRetainedBlockGraph.tableProductCache.prepare({
      textMeasurer,
      textMeasurerVersion: textMeasurer.version,
      font,
      lineHeight: quireDefaultLayoutBlockHeight,
      textBaselineOffset,
      lineBreakMode,
      ...(options.lineBreaker?.name === undefined
        ? {}
        : { lineBreakerName: options.lineBreaker.name })
    });
    const documentProfile = resolveQuireDocumentProfile(options.editor?.extensionManager);
    const tableStyleContext = documentProfile.tableModel.styleContext(state.doc);
    const layoutProviderRegistry = createQuireSnapshotLayoutProviderRegistry(
      options.editor?.extensionManager,
      documentProfile.tableModel,
      tableStyleContext,
      activeRetainedBlockGraph.tableProductCache,
      columnWidth !== undefined
    );
    const { pageModel, drawingModel } = documentProfile;
    const storyRangesById = new Map(
      pageModel.listStories(state.doc).map((story) => [story.id, { from: story.from, to: story.to }])
    );
    const sourceCapabilityResolvers = [
      ...documentProfile.inlineSources({
        state,
        textMeasurer,
        font,
        lineHeight: quireDefaultLayoutBlockHeight,
        baselineOffset: textBaselineOffset
      }),
      ...(drawingModel.anchorNodeType === null
        ? []
        : [createQuireDrawingObjectSourceCapabilityResolver(drawingModel.anchorNodeType, drawingModel, { storyRangesById, document: state.doc })])
    ];
    const sourceCapabilityRegistry = createQuireInlineSourceCapabilityRegistry(sourceCapabilityResolvers, occurrenceValues);
    const blockInputOptions: QuireProseMirrorBlockInputOptions = {
      ...options,
      ...createQuireBodyFlowCallbacks(pageModel, sectionIndex, state.doc),
      paragraphModel: documentProfile.paragraphModel,
      tableModel: documentProfile.tableModel,
      tableStyleContext,
      snapshotVersion: viewGraphOptions.version,
      layoutProviderRegistry,
      sourceCapabilityRegistry,
      resolveMarkQuireStyle: createQuireMarkStyleResolver(state),
      resolveNodeQuireTextStyle: createQuireNodeTextStyleResolver(
        state,
        font,
        applyDocumentTheme
      ),
      width: flowRect.width,
      font,
      ...(documentFontTheme === undefined ? {} : { documentFontTheme }),
      ...(documentFontTable === undefined ? {} : { documentFontTable }),
      lineHeight: quireDefaultLayoutBlockHeight,
      textBaselineOffset,
      textMeasurer,
      lineBreakMode,
      hiddenTextViewMode: options.hiddenTextViewMode ?? "normal"
    };
    const inputs = traceQuireLayoutStage(options.trace, "layout:collect", () =>
      collectQuireProseMirrorBlockInputs(blockInputOptions)
    );
    const document = traceQuireLayoutStage(options.trace, "layout:block-layout", () =>
      layoutQuireBlockDocument({
        id: "doc",
        range: resolveQuireBodyFlowRange(inputs),
        rect: flowRect,
        blockHeight: quireDefaultLayoutBlockHeight,
        blockGap,
        ...(options.pageGeometry === undefined
          ? {}
          : { fragmentBlockSize: options.pageGeometry.bodyRect.height }),
        children: inputs,
        retainedBlockGraph: activeRetainedBlockGraph,
        ...(options.layoutDirtyRange === undefined || options.layoutDirtyRange === null
          ? {}
          : {
              dirtyRange: options.layoutDirtyRange.changedRange,
              layoutDirtyRange: options.layoutDirtyRange
            })
      }));

    const storyOptions = {
      state,
      blockInputOptions: columnWidth === undefined ? blockInputOptions : { ...blockInputOptions, width: bodyRect.width },
      width: bodyRect.width,
      blockHeight: quireDefaultLayoutBlockHeight, blockGap,
      providerExecutionLifecycle: activeRetainedBlockGraph.providerExecutionLifecycle,
      pageModel, drawingModel
    };
    // Stories are measured in story-local coordinates; only the measure width
    // and the table-fit flag tie a batch to the requesting section.
    const fitTables = columnWidth !== undefined && doStoriesHoldTables(state.doc, pageModel, documentProfile.tableModel);
    const noteOptions = { ...storyOptions, blockInputOptions, width: flowRect.width };
    /**
     * Compiles one story batch, or takes it from an earlier pass of the build.
     *
     * @param batch - Story family.
     * @param stage - Trace stage recorded only by a real compile.
     * @param batchOptions - Story services at the batch measure.
     * @param compile - Batch compiler.
     * @returns Story sources valid for this pass.
     */
    const readStories = <Result>(batch: QuireStorySourceBatch, stage: string, batchOptions: typeof storyOptions,
      compile: (compileOptions: typeof storyOptions) => Result): Result => {
      if (stories === undefined) return traceQuireLayoutStage(options.trace, stage, () => compile(batchOptions));
      return stories.read(batch, batchOptions.width, fitTables, occurrenceValues, batchOptions.providerExecutionLifecycle,
        (values, lifecycle) => traceQuireLayoutStage(options.trace, stage, () => compile({
          ...batchOptions,
          providerExecutionLifecycle: lifecycle,
          // A story-owned registry records which candidate text the batch read.
          blockInputOptions: { ...batchOptions.blockInputOptions,
            sourceCapabilityRegistry: createQuireInlineSourceCapabilityRegistry(sourceCapabilityResolvers, values) }
        })));
    };
    const pageBandSources = readStories("page-bands", "layout:page-band-sources", storyOptions, compileQuirePageBandStorySources);
    const wordDrawingTextSources = readStories("drawing-text", "layout:word-drawing-text-sources", storyOptions, compileQuireWordDrawingTextStorySources);
    // Footnotes sit in the page or column holding their reference, so they are
    // measured at the body flow width rather than the full body width.
    const footnoteSources = options.pageGeometry === undefined ? []
      : readStories("footnotes", "layout:footnote-sources", noteOptions, compileQuirePageFootnoteSources);
    const endnoteSources = options.pageGeometry === undefined || !endsDocument ? []
      : readStories("endnotes", "layout:endnote-sources", noteOptions, compileQuirePageEndnoteSources);
    activeRetainedBlockGraph.providerExecutionLifecycle.endSnapshot(
      viewGraphOptions.version
    );
    return {
      document,
      pageBandSources,
      wordDrawingTextSources,
      footnoteSources,
      endnoteSources,
      textMeasurer,
      viewGraphOptions
    };
  } catch (error) {
    activeRetainedBlockGraph.providerExecutionLifecycle.abortSnapshot(
      viewGraphOptions.version
    );
    throw error;
  }
}

/**
 * Resolves the source range owned by collected body-flow blocks.
 *
 * Auxiliary story stores can follow the body in the shared document but do not
 * extend the body layout root. A normal body-only document still resolves to
 * the same full content range.
 *
 * @param inputs - Body-flow block inputs in source order.
 * @returns Range spanning the collected body blocks, or an empty range.
 */
function resolveQuireBodyFlowRange(
  inputs: readonly { readonly range: { readonly from: number; readonly to: number } }[]
): { readonly from: number; readonly to: number } {
  const first = inputs[0];
  const last = inputs.at(-1);
  return first === undefined || last === undefined
    ? { from: 0, to: 0 }
    : { from: first.range.from, to: last.range.to };
}
