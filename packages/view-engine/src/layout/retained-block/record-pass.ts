import { projectQuireRetainedBlockLayout } from "./projection";
import {
  resolveQuireRetainedProjectedExtraHeight,
  resolveQuireRetainedFlowLeadingSpacing
} from "./flow";
import {
  createQuireRetainedBlockDependencySignature,
  createQuireRetainedBlockRecord,
  resolveQuireRetainedBlockDirtyPriority
} from "./reconcile";
import type {
  QuireRetainedBlockLayoutRecord,
  QuireRetainedBlockReconcileOptions
} from "./types";

/** Candidate local-record pass built before height indexing and projection. */
export interface QuireRetainedBlockRecordPass {
  /** Candidate records keyed by stable id. */
  readonly recordsById: ReadonlyMap<string, QuireRetainedBlockLayoutRecord>;
  /** Candidate records in current document order. */
  readonly orderedRecords: readonly QuireRetainedBlockLayoutRecord[];
  /** Leading spacing before the first block. */
  readonly leadingSpacing: number;
  /** Number of current inputs inspected. */
  readonly reconciledRecords: number;
  /** Number of local records rebuilt. */
  readonly rebuiltRecords: number;
  /** Number of local records reused. */
  readonly reusedRecords: number;
}

/**
 * Reconciles local retained records without publishing graph state.
 *
 * A provisional absolute origin is passed only to builders whose provider
 * contracts require document-space input. Built boxes are normalized before
 * entering the returned record pass.
 *
 * @param previous - Last committed records keyed by stable id.
 * @param options - Current reconciliation inputs and local builder.
 * @returns Candidate local-record pass with commit-local counters.
 */
export function reconcileQuireRetainedBlockRecords(
  previous: ReadonlyMap<string, QuireRetainedBlockLayoutRecord>,
  options: QuireRetainedBlockReconcileOptions
): QuireRetainedBlockRecordPass {
  const recordsById = new Map<string, QuireRetainedBlockLayoutRecord>();
  const orderedRecords: QuireRetainedBlockLayoutRecord[] = [];
  const leadingSpacing = resolveQuireRetainedFlowLeadingSpacing(options.children);
  let provisionalY = options.y + leadingSpacing;
  let rebuiltRecords = 0;
  let reusedRecords = 0;

  for (let index = 0; index < options.children.length; index += 1) {
    const input = options.children[index]!;
    if (recordsById.has(input.id)) {
      throw new Error(`Duplicate retained block identity: ${input.id}`);
    }
    const dirtyPriority = resolveQuireRetainedBlockDirtyPriority(input, index, options);
    const dependencySignature = createQuireRetainedBlockDependencySignature(input, options);
    const retained = previous.get(input.id);
    let record: QuireRetainedBlockLayoutRecord;

    if (
      retained === undefined ||
      retained.dependencySignature !== dependencySignature ||
      dirtyPriority !== "clean" ||
      input.layoutProvider !== undefined
    ) {
      // Provider authority must compile fresh snapshot-bound owner products.
      // Safe child measurement reuse remains available inside provider services.
      record = createQuireRetainedBlockRecord(
        input,
        dependencySignature,
        dirtyPriority,
        { x: options.x, y: provisionalY },
        options
      );
      rebuiltRecords += 1;
    } else {
      record = retained;
      reusedRecords += 1;
    }

    const rangeChanged =
      record.input.range.from !== input.range.from ||
      record.input.range.to !== input.range.to;
    if (
      retained !== undefined &&
      dirtyPriority === "clean" &&
      rangeChanged &&
      projectQuireRetainedBlockLayout(record.localBox, record.input, input, 0, 0) === undefined
    ) {
      record = createQuireRetainedBlockRecord(
        input,
        dependencySignature,
        dirtyPriority,
        { x: options.x, y: provisionalY },
        options
      );
      rebuiltRecords += 1;
      reusedRecords -= 1;
    }

    recordsById.set(input.id, record);
    orderedRecords.push(record);
    provisionalY += record.intrinsicHeight +
      resolveQuireRetainedProjectedExtraHeight(
        input,
        options.children[index + 1]
      ) +
      (index + 1 < options.children.length
        ? options.blockGap
        : 0);
  }

  return {
    recordsById,
    orderedRecords,
    leadingSpacing,
    reconciledRecords: options.children.length,
    rebuiltRecords,
    reusedRecords
  };
}
