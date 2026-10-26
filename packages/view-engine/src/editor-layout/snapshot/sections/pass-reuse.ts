import type { QuirePageModelProfile } from "../../../document-profile/types";
import type { QuireLayoutSnapshotOptions } from "../../types";
import type { SectionLayoutContext, SectionLayoutSource } from "./types";
import { RecordedOccurrenceValues } from "../occurrence-text/recorded";

/** Latest compile of one section within a build. */
interface SectionPassEntry {
  /** Page context and geometry the source was compiled against. */
  readonly key: string;
  /** Candidate text of every anchor the compile depends on; undefined means stored text. */
  readonly values: ReadonlyMap<string, string | undefined>;
  /** Compiled section source. */
  readonly source: SectionLayoutSource;
}

/**
 * Reuses section sources between pagination-text convergence passes of one build.
 *
 * Candidate text reaches a compile only through source-anchor lookups, and the
 * bodies of different sections own disjoint anchors. A section compiled against
 * the same page context whose anchors receive the same text yields the same
 * source, so only its projection is bound to the current pass again.
 */
export class QuireSectionPassReuse {
  /** Latest entry per section owner index. */
  private readonly entries = new Map<number, SectionPassEntry>();

  /** @param pageModel - Page semantics resolving each section's first page number. */
  constructor(private readonly pageModel: QuirePageModelProfile) {}

  /**
   * @param options - Section compile inputs with resolved page geometry.
   * @param context - Page context of the current pass.
   * @param values - Candidate text of the current pass, absent for stored text.
   * @param compile - Compiles the section with a recording view of `values`.
   * @returns Reused or newly compiled section source.
   */
  compile(
    options: QuireLayoutSnapshotOptions,
    context: SectionLayoutContext,
    values: ReadonlyMap<string, string> | undefined,
    compile: (values: ReadonlyMap<string, string>) => SectionLayoutSource
  ): SectionLayoutSource {
    const key = JSON.stringify([options.pageGeometry, context.pageIndexOffset, context.sharesFirstPage,
      context.sectionNumber, context.endsDocument, this.pageModel.firstPageNumber(context.section)]);
    const entry = this.entries.get(context.section.index);
    if (entry?.key === key && [...entry.values].every(([id, text]) => values?.get(id) === text)) return entry.source;
    const recorded = new RecordedOccurrenceValues(values ?? []);
    const source = compile(recorded);
    // Candidate text only names body anchors. Table cells restored from their
    // product cache keep anchors that the compile never looked up.
    for (const anchor of source.compilation.document.anchors) recorded.get(anchor.sourceAnchorId);
    this.entries.set(context.section.index, { key, values: recorded.reads, source });
    return source;
  }
}
