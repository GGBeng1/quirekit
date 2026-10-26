import type { QuireLayoutSnapshotOptions } from "../types";
import type { SectionLayoutContext, SectionLayoutProduct, SectionLayoutSource } from "./sections/types";
import type { QuireLayoutProduct } from "./reuse/types";
import type { QuireRetainedBlockLayoutGraph } from "../../layout/retained-block";
import { prepareQuireLayoutDocumentPagination } from "../../layout/engine/pagination";
import { projectQuireLayoutDocumentToPages } from "../../layout/engine/pagination/projection";
import { captureQuireLayoutProjectionSignature } from "./reuse/inputs";
import { compileQuireInfiniteLayoutDocument } from "./document";
import { traceQuireLayoutStage } from "./trace";
import { resolveQuireDocumentProfile } from "../../document-profile";
import { attachQuirePageBandInstances, resolveQuirePageBandPageGeometry } from "./page-bands";
import { attachQuireWordDrawingTextInstances } from "./word-drawing-text";
import { appendQuirePageEndnotes, attachQuirePageEndnoteInstances, attachQuirePageFootnoteInstances, collectQuireStoryLineBottoms } from "./page-notes";
import { quireDefaultLayoutBlockHeight } from "./constants";
import { normalizeQuirePositiveAreaRects } from "@quirekit/renderer";
import type { QuireStorySourceTable } from "./story-sources";

/** @param options - Complete source state and physical geometry. @param retainedBlockGraph - Optional single-section cache. @param sectionContext - Multi-section identity and field context. @param occurrenceValues - Candidate text before measurement. @param stories - Story sources shared by the build's passes. @returns Paginated source and retained projector. */
export function compileLayoutPart(options: QuireLayoutSnapshotOptions, retainedBlockGraph?: QuireRetainedBlockLayoutGraph, sectionContext?: SectionLayoutContext, occurrenceValues?: ReadonlyMap<string, string>, stories?: QuireStorySourceTable): SectionLayoutProduct {
  return bindLayoutPart(compileLayoutPartSource(options, retainedBlockGraph, sectionContext, occurrenceValues, stories), sectionContext);
}

/** @param options - Complete source state and physical geometry. @param retainedBlockGraph - Optional single-section cache. @param sectionContext - Multi-section identity; only its section, page offset and document end are read. @param occurrenceValues - Candidate text before measurement. @param stories - Story sources shared by the build's passes. @returns Measured and paginated section source, independent of later sections. */
export function compileLayoutPartSource(options: QuireLayoutSnapshotOptions, retainedBlockGraph?: QuireRetainedBlockLayoutGraph, sectionContext?: SectionLayoutContext, occurrenceValues?: ReadonlyMap<string, string>, stories?: QuireStorySourceTable): SectionLayoutSource {
  const { pageModel } = resolveQuireDocumentProfile(options.editor?.extensionManager);
  const leadingSection = pageModel.leadingSection(options.state.doc);
  const pageGeometry = options.pageGeometry
    ?? (leadingSection === null ? undefined : pageModel.sectionPageGeometry(leadingSection, options.viewportRect));
  const resolvedOptions = pageGeometry === undefined || pageGeometry === options.pageGeometry
    ? options
    : { ...options, pageGeometry };
  const { state } = resolvedOptions;
  const compilation = compileQuireInfiniteLayoutDocument(
    resolvedOptions,
    retainedBlockGraph,
    sectionContext?.section.index,
    sectionContext?.endsDocument ?? true,
    occurrenceValues,
    stories
  );
  const { document, pageBandSources, footnoteSources, endnoteSources } = compilation;
  const paginationPageGeometry = resolvedOptions.pageGeometry === undefined
    ? undefined
    : resolveQuirePageBandPageGeometry({
        documentNode: state.doc,
        pageGeometry: resolvedOptions.pageGeometry,
        sources: pageBandSources,
        section: sectionContext?.section,
        pageModel
      });
  let paginatedDocument = traceQuireLayoutStage(resolvedOptions.trace, "layout:paginate", () =>
    paginationPageGeometry === undefined
      ? document
      : prepareQuireLayoutDocumentPagination({
        ...resolvedOptions,
        document,
        collectSourceFragments: false,
        pageGeometry: paginationPageGeometry,
        notes: footnoteSources.map((source) => ({
          id: source.noteId, referencePosition: source.referencePosition, height: source.layout.rect.height,
          lines: collectQuireStoryLineBottoms(source.layout)
        })),
        noteSeparatorHeight: quireDefaultLayoutBlockHeight,
        noteContinuationSeparatorHeight: quireDefaultLayoutBlockHeight
      }));
  if (paginationPageGeometry !== undefined) paginatedDocument = appendQuirePageEndnotes(paginatedDocument, endnoteSources, paginationPageGeometry);
  if (sectionContext) paginatedDocument = { ...paginatedDocument,
    pages: paginatedDocument.pages.map(page => ({ ...page, pageIndex: page.pageIndex + sectionContext.pageIndexOffset })) };
  return { options: resolvedOptions, leadingSection, compilation, paginationPageGeometry, paginatedDocument };
}

/** @param source - Compiled section source. @param sectionContext - Page context of the current compile, read lazily by projection. @returns Retained product whose projector uses this context's whole-document totals. */
export function bindLayoutPart(source: SectionLayoutSource, sectionContext?: SectionLayoutContext): SectionLayoutProduct {
  const { pageModel } = resolveQuireDocumentProfile(source.options.editor?.extensionManager);
  const { options: resolvedOptions, leadingSection, paginationPageGeometry, paginatedDocument } = source;
  const { state } = resolvedOptions;
  const { document, pageBandSources, wordDrawingTextSources, footnoteSources, endnoteSources, textMeasurer, viewGraphOptions } = source.compilation;

  /**
   * Reprojects complete page facts before attaching page-local Story occurrences.
   *
   * @param projectionOptions - Current window and diagnostics, without new layout authority.
   * @returns Fresh projected document; the retained source is never mutated.
   */
  const projectDocument = (projectionOptions: QuireLayoutSnapshotOptions): QuireLayoutProduct["document"] => {
    const projectedDocument = paginationPageGeometry === undefined ? document : traceQuireLayoutStage(
      projectionOptions.trace, "layout:project", () => projectQuireLayoutDocumentToPages({
        document: paginatedDocument,
        sourceFlowX: document.rect.x,
        projectionClipRects: projectionOptions.snapshotClipRects,
        trace: projectionOptions.trace
      }));
    const storyDocument = traceQuireLayoutStage(
      projectionOptions.trace,
      "layout:page-band-instances",
      () => attachQuirePageBandInstances({
        documentNode: state.doc,
        layoutDocument: projectedDocument,
        sources: pageBandSources,
        textMeasurer,
        sectionContext,
        pageModel,
        clipRects: normalizeQuirePositiveAreaRects(projectionOptions.snapshotClipRects)
      })
    );
    const noteDocument = traceQuireLayoutStage(
      projectionOptions.trace,
      "layout:footnote-instances",
      () => attachQuirePageFootnoteInstances({
        layoutDocument: storyDocument,
        documentNode: state.doc,
        sources: footnoteSources,
        separatorHeight: quireDefaultLayoutBlockHeight,
        continuationSeparatorHeight: quireDefaultLayoutBlockHeight,
        section: sectionContext?.section,
        pageCount: sectionContext?.pageCount() ?? storyDocument.pages.length,
        textMeasurer,
        pageModel
      })
    );
    const endnoteDocument = traceQuireLayoutStage(
      projectionOptions.trace,
      "layout:endnote-instances",
      () => attachQuirePageEndnoteInstances({
        layoutDocument: noteDocument,
        documentNode: state.doc,
        sources: endnoteSources,
        separatorHeight: quireDefaultLayoutBlockHeight,
        continuationSeparatorHeight: quireDefaultLayoutBlockHeight,
        section: sectionContext?.section,
        pageCount: sectionContext?.pageCount() ?? noteDocument.pages.length,
        textMeasurer,
        pageModel
      })
    );
    return traceQuireLayoutStage(
      projectionOptions.trace,
      "layout:word-drawing-text-instances",
      () => attachQuireWordDrawingTextInstances({
        layoutDocument: endnoteDocument,
        sources: wordDrawingTextSources
      })
    );
  };
  return {
    document: paginatedDocument, sourceDocument: document,
    paginationTextSources: [{ physicalPageOffset: sectionContext?.pageIndexOffset ?? 0, section: sectionContext?.section ?? leadingSection, sectionNumber: sectionContext?.sectionNumber ?? 1, sourceDocument: document, paginatedDocument }],
    projectionSignature: captureQuireLayoutProjectionSignature(resolvedOptions),
    projectDocument, viewGraphOptions
  };
}
