import { createQuireSubtreePredicate } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireLayoutProviderExecutionLifecycle } from "../../layout/providers";
import type { QuirePageModelProfile, QuireTableModelProfile } from "../../document-profile/types";
import { RecordedOccurrenceValues } from "./occurrence-text/recorded";

/** Story families one flow compiles together. */
export type QuireStorySourceBatch = "page-bands" | "drawing-text" | "footnotes" | "endnotes";

/** Latest compile of one story batch at one measure. */
interface StoryBatchEntry {
  /** Candidate text of every anchor the compile looked up; undefined means stored text. */
  readonly reads: ReadonlyMap<string, string | undefined>;
  /** Compiled story sources. */
  readonly result: unknown;
}

/**
 * Story sources shared by every section pass of one layout build.
 *
 * Stories are measured in story-local coordinates, so the section whose pass
 * requests them only contributes the measure width and whether overwide tables
 * shrink into it. A later pass reuses a batch when its anchors read the same
 * candidate text. Batches whose providers carry continuation state stay per pass.
 */
export class QuireStorySourceTable {
  /** Latest batch per family and measure. */
  private readonly entries = new Map<string, StoryBatchEntry>();

  /**
   * @param batch - Story family.
   * @param width - Measure width of the requesting flow.
   * @param fitTablesToWidth - Whether the requesting flow shrinks overwide tables.
   * @param values - Candidate text of the requesting pass, absent for stored text.
   * @param lifecycle - Provider lifecycle of the requesting pass.
   * @param compile - Compiles the batch with a recording view of `values`.
   * @returns Reused or newly compiled story sources.
   */
  read<Result>(
    batch: QuireStorySourceBatch,
    width: number,
    fitTablesToWidth: boolean,
    values: ReadonlyMap<string, string> | undefined,
    lifecycle: QuireLayoutProviderExecutionLifecycle,
    compile: (values: ReadonlyMap<string, string>, lifecycle: QuireLayoutProviderExecutionLifecycle) => Result
  ): Result {
    const key = `${batch}\u0000${width}\u0000${fitTablesToWidth}`;
    const entry = this.entries.get(key);
    // Every lookup also reaches the pass's own recorder, so section reuse sees story dependencies.
    if (entry !== undefined && [...entry.reads].every(([id, text]) => values?.get(id) === text)) return entry.result as Result;
    const recorded = new RecordedOccurrenceValues(values ?? []);
    const observed = observeContinuations(lifecycle);
    const result = compile(recorded, observed.lifecycle);
    for (const id of recorded.reads.keys()) values?.get(id);
    if (!observed.retainsState()) this.entries.set(key, { reads: recorded.reads, result });
    else this.entries.delete(key);
    return result;
  }
}

/**
 * Wraps a provider lifecycle to detect state carried between executions.
 *
 * @param lifecycle - Lifecycle of the requesting pass.
 * @returns Delegating lifecycle and whether any execution read or produced a continuation.
 */
function observeContinuations(lifecycle: QuireLayoutProviderExecutionLifecycle) {
  let retains = false;
  const observed: QuireLayoutProviderExecutionLifecycle = {
    beginSnapshot: version => lifecycle.beginSnapshot(version),
    endSnapshot: version => lifecycle.endSnapshot(version),
    abortSnapshot: version => lifecycle.abortSnapshot(version),
    openExecution(request) {
      const lease = lifecycle.openExecution(request);
      if (lease.previousContinuation !== undefined) retains = true;
      return lease;
    },
    acceptExecution(lease, continuation) {
      if (continuation !== null) retains = true;
      lifecycle.acceptExecution(lease, continuation);
    },
    rejectExecution: lease => lifecycle.rejectExecution(lease),
    snapshot: () => lifecycle.snapshot()
  };
  return { lifecycle: observed, retainsState: () => retains };
}

/** Subtree tests per table node type. */
const tablePredicates = new Map<string, (node: ProseMirrorNode) => boolean>();

/**
 * Tells whether any auxiliary story holds a table, the only content the table-fit flag changes.
 *
 * @param doc - Current document.
 * @param pageModel - Page semantics listing the stories.
 * @param tableModel - Table semantics naming the table node type.
 * @returns Whether a story contains a table.
 */
export function doStoriesHoldTables(doc: ProseMirrorNode, pageModel: QuirePageModelProfile, tableModel: QuireTableModelProfile): boolean {
  const type = tableModel.tableNodeType;
  if (type === null) return false;
  let predicate = tablePredicates.get(type);
  if (predicate === undefined) {
    predicate = createQuireSubtreePredicate(node => node.type.name === type);
    tablePredicates.set(type, predicate);
  }
  return pageModel.listStories(doc).some(story => predicate(story.node));
}
