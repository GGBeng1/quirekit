import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageModelProfile, QuirePageSection } from "../../../document-profile/types";
import type { QuireLayoutSnapshotOptions } from "../../types";
import type { QuireLayoutDocument } from "../../../layout/engine/types";
import { captureQuireLayoutProjectionSignature } from "../reuse/inputs";
import type { CompileSectionLayout, SectionLayoutProduct } from "./types";
import { mergeSectionDocuments } from "./merge";
import { appendSectionPaddingPage, needsSectionPaddingPage } from "./parity";
import { resolveTerminalPlacement, retainTerminalPlacement } from "./terminal";

/**
 * Measures each next-page section at its own width and stacks accepted physical pages.
 * @param options - Unchanged editor state and viewport services.
 * @param sections - Admitted sections with inherited story references resolved.
 * @param pageModel - Page semantics owning section geometry and numbering continuity.
 * @param compile - Canonical section compiler; never receives a synthetic EditorState.
 * @param deferProjection - Whether convergence needs raw complete pages before creating visible occurrences.
 * @returns Retained full layout whose window projections do not rerun pagination.
 */
export function compileSectionLayouts(options: QuireLayoutSnapshotOptions, sections: readonly QuirePageSection[], pageModel: QuirePageModelProfile, compile: CompileSectionLayout, deferProjection = false): SectionLayoutProduct {
  const parts: SectionLayoutProduct[] = [];
  const sectionPageCounts: number[] = [];
  const bodyRanges = new Map<number, QuireDocumentRange[]>();
  let pageCount = 0;
  let nextNumber = 1;
  let y = options.pageGeometry?.pageRect.y ?? options.viewportRect.y;
  const geometries = sections.map(source => options.pageGeometry ?? pageModel.sectionPageGeometry(source, options.viewportRect)!);
  const width = Math.max(...geometries.map(geometry => geometry.pageRect.width));
  for (const [index, original] of sections.entries()) {
    let source = original;
    let terminal: ReturnType<typeof resolveTerminalPlacement> | undefined;
    if (index > 0 && index === sections.length - 1 && source.terminalRegion) {
      // Only the final constrained section is probed. Its measured visual
      // extent decides sharing before parity padding or page-band projection.
      const probe = compile({ ...options, pageGeometry: geometries[index]!, paginationCheckpointStore: undefined }, {
        section: pageModel.continueNumbering(source, nextNumber), pageIndexOffset: pageCount, sharesFirstPage: false,
        sectionNumber: index + 1, endsDocument: true, pageCount: () => pageCount + 1
      });
      terminal = resolveTerminalPlacement(source, probe, parts.at(-1)!.document.pages.at(-1)!);
      source = { ...source, continuesPreviousPage: terminal.sharesPreviousPage };
    }
    // Resolve sheet parity before compiling the next source. The blank extends
    // the preceding section's count without adding any canonical document node.
    const padded = needsSectionPaddingPage(source, pageCount);
    if (padded) {
      const previous = appendSectionPaddingPage(parts[index - 1]!, pageCount, y);
      parts[index - 1] = previous;
      sectionPageCounts[index - 1] = (sectionPageCounts[index - 1] ?? 0) + 1;
      const blank = previous.document.pages.at(-1)!;
      y = blank.pageRect.y + blank.pageRect.height + (geometries[index - 1]!.pageGap ?? 0);
      pageCount += 1;
      nextNumber += 1;
    }
    // A continuing section resumes on the previous section's last page, below
    // that section's content, which is balanced first when it has columns.
    const previousPage = parts.at(-1)?.document.pages.at(-1);
    const shares = source.continuesPreviousPage === true && previousPage !== undefined;
    const section = pageModel.continueNumbering(source, shares ? nextNumber - 1 : nextNumber);
    const base = geometries[index]!;
    if (shares) y = previousPage.pageRect.y;
    const dx = (width - base.pageRect.width) / 2;
    const dy = y - base.pageRect.y;
    const bodyRectVariants = base.bodyRectVariants === undefined ? undefined : Object.fromEntries(
      Object.entries(base.bodyRectVariants).map(([key, rect]) => [key, rect === undefined ? undefined : { ...rect, x: rect.x + dx, y: rect.y + dy }])
    );
    // Center physical sheets before measurement so body, stories and hit geometry
    // share the same document-space translation, independently of display zoom.
    const pageGeometry = { ...base, bodyRectVariants, pageRect: { ...base.pageRect, x: base.pageRect.x + dx, y }, bodyRect: { ...base.bodyRect, x: base.bodyRect.x + dx, y: base.bodyRect.y + dy },
      ...(shares ? { firstPageBodyTop: previousPage.rect.y + previousPage.rect.height, firstPageBodyBottom: readNotesTop(previousPage) } : {}),
      ...(sections[index + 1]?.continuesPreviousPage === true ? { balanceLastPageColumns: true } : {}) };
    let part = compile({ ...options, pageGeometry, paginationCheckpointStore: undefined }, {
      section, pageIndexOffset: shares ? pageCount - 1 : pageCount, sharesFirstPage: shares,
      sectionNumber: index + 1, sectionPageCount: () => sectionPageCounts[index] ?? 0,
      endsDocument: index === sections.length - 1, pageCount: () => pageCount,
      ...(terminal && padded ? { omittedBandRanges: source.terminalRegion!.omitBandRangesAfterPadding } : {}),
      pageBodyRanges: pageIndex => bodyRanges.get(pageIndex) ?? []
    });
    if (terminal) part = retainTerminalPlacement(part, { ...terminal, sectionIndex: source.index, sectionPosition: source.position, precededByPadding: padded });
    const pages = part.document.pages;
    // One physical sheet can contain several continuous sections. Gather their
    // canonical ranges once before any window instantiates page-band text.
    for (const page of pages) {
      const ranges = bodyRanges.get(page.pageIndex) ?? [];
      ranges.push(page.range); bodyRanges.set(page.pageIndex, ranges);
    }
    sectionPageCounts[index] = pages.length;
    pageCount += shares ? pages.length - 1 : pages.length;
    nextNumber = pageModel.firstPageNumber(section) + pages.length;
    const last = pages.at(-1);
    if (last) y = last.pageRect.y + last.pageRect.height + (pageGeometry.pageGap ?? 0);
    parts.push(part);
  }
  // Total-page fields and repeated story occurrences are created only after all
  // sections have accepted pages. Projection keeps source positions unchanged.
  /** @param projection - Current viewport window. @returns Projected pages without recollecting source content. */
  const projectDocument = (projection: QuireLayoutSnapshotOptions) => mergeSectionDocuments(parts.map(part => part.projectDocument(projection)));
  return { document: deferProjection ? mergeSectionDocuments(parts.map(part => part.document)) : projectDocument(options), sourceDocument: mergeSectionDocuments(parts.map(part => part.sourceDocument)),
    paginationTextSources: parts.flatMap(part => part.paginationTextSources ?? []),
    projectionSignature: captureQuireLayoutProjectionSignature(options), projectDocument, viewGraphOptions: parts[0]!.viewGraphOptions };
}

/** @param page - Last page of the previous section. @returns Top of its page-bottom notes, which a continuing section stays above. */
function readNotesTop(page: QuireLayoutDocument["pages"][number]): number {
  const height = Math.max(page.noteAreaHeight ?? 0, ...(page.columns ?? []).map(column => column.noteAreaHeight ?? 0));
  return (page.noteAreaBottom ?? page.bodyRect.y + page.bodyRect.height) - height;
}
