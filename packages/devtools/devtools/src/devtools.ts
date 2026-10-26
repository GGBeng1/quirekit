import type {
  CanvasMountedViewRenderEvent,
  QuireMountedViewRenderEvent,
  QuireViewRenderCacheCounters
} from "@quirekit/view";
import { Extension, type QuireAnyExtension, type QuireEditor } from "@quirekit/core";
import { observeQuireDevtoolsInteractions } from "./interaction/observer";
import { QuireDevtoolsInteractionTraceManager } from "./interaction/trace";
import { summarizeInteractionTrigger } from "./interaction/trigger";
import { summarizeTransactionOperation } from "./operation";
import { collectQuireDevtoolsEditorOperationPhases } from "./operation/phases";
import { mountQuireDevtoolsPanel } from "./panel";
import { createQuireDevtoolsRecorder } from "./recorder";
import { readDefaultClock } from "./recorder/config";
import { summarizeMountedRenderEvent } from "./render";
import { createQuireDevtoolsSnapshot } from "./snapshot";
import type {
  QuireDevtools,
  QuireDevtoolsClock,
  QuireDevtoolsEntry,
  QuireDevtoolsMount,
  QuireDevtoolsOptions,
  QuireDevtoolsOperationTriggerSummary,
  QuireDevtoolsRenderSummary,
  QuireDevtoolsSnapshot,
  QuireDevtoolsSnapshotOptions,
  QuireDevtoolsSubscriber,
  QuireDevtoolsSubscription
} from "./types";

/** Runtime implementation backing a public devtools instance. */
class QuireDevtoolsRuntime implements QuireDevtools {
  private readonly clock: QuireDevtoolsClock;
  private readonly recorder;
  private readonly interactionTraces;
  private readonly subscribers = new Set<QuireDevtoolsSubscriber>();
  private readonly recorderSubscription: QuireDevtoolsSubscription;
  private readonly previousRenderCacheCountersByView =
    new Map<string, QuireViewRenderCacheCounters>();
  private editor: QuireEditor | undefined;
  private latestRender: QuireDevtoolsRenderSummary | undefined;
  private latestInteraction: QuireDevtoolsOperationTriggerSummary | undefined;

  /**
   * Creates a devtools runtime.
   *
   * @param options - Devtools options.
   */
  constructor(options: QuireDevtoolsOptions = {}) {
    this.clock = options.clock ?? readDefaultClock;
    this.recorder = createQuireDevtoolsRecorder({
      ...options,
      clock: this.clock
    });
    this.interactionTraces = new QuireDevtoolsInteractionTraceManager({
      recorder: this.recorder
    });
    this.recorderSubscription = this.recorder.subscribe(() => {
      this.notify();
    });
  }

  /**
   * Creates the editor extension that attaches the recorder to an editor.
   *
   * @returns Extension to include in the editor extension list.
   */
  extension(): QuireAnyExtension {
    return Extension.create({
      name: "devtools",
      priority: 1000,
      onCreate: ({ editor }) => {
        this.attachEditor(editor);
      },
      onDestroy: ({ editor }) => {
        if (this.editor === editor) {
          this.detachEditor();
        }
      },
      dispatchTransaction: ({ transaction, next }) => {
        const editor = this.requireAttachedEditor();
        const token = this.recorder.startOperation(
          summarizeTransactionOperation(transaction, {
            ...(this.latestInteraction ? { trigger: this.latestInteraction } : {})
          })
        );
        const phases = collectQuireDevtoolsEditorOperationPhases({
          editor,
          clock: this.clock
        });

        try {
          next(transaction);
        } finally {
          this.recorder.finishOperation(token, {
            phases: phases.finish()
          });
          this.latestInteraction = undefined;
        }
      }
    });
  }

  /**
   * Records a Canvas mounted view render event.
   *
   * @param event - Canvas render event emitted by `@quirekit/view`.
   */
  onCanvasRender(event: CanvasMountedViewRenderEvent): void {
    this.onRender(event);
  }

  /**
   * Records any mounted view render event.
   *
   * @param event - Mounted render event emitted by `@quirekit/view`.
   */
  onRender(event: QuireMountedViewRenderEvent): void {
    this.latestRender = attachRenderCacheCounterDelta(
      summarizeMountedRenderEvent(event),
      this.previousRenderCacheCountersByView
    );
    const entry = this.recorder.recordRender(this.latestRender);

    this.interactionTraces.settleAfterRender(entry);

    if (!entry) {
      this.notify();
    }
  }

  /**
   * Observes browser interactions inside an editor host for input-to-render traces.
   *
   * @param element - Element whose input and pointer events should be traced.
   * @returns Mounted observer handle.
   */
  observeInteractions(element: HTMLElement): QuireDevtoolsMount {
    return observeQuireDevtoolsInteractions(element, {
      record: (input) => {
        this.latestInteraction = summarizeInteractionTrigger(input);
        this.interactionTraces.start(input);
      }
    });
  }

  /**
   * Reads current devtools entries.
   *
   * @returns Recent devtools entries in chronological order.
   */
  getEntries(): readonly QuireDevtoolsEntry[] {
    return this.recorder.getEntries();
  }

  /**
   * Clears all recorded entries (the recorder notifies subscribers to re-render).
   */
  clear(): void {
    this.recorder.clear();
  }

  /**
   * Reads a current editor snapshot.
   *
   * @param options - Snapshot detail options.
   * @returns Current editor and render summary.
   */
  getSnapshot(options?: QuireDevtoolsSnapshotOptions): QuireDevtoolsSnapshot {
    return createQuireDevtoolsSnapshot(this.editor, this.latestRender, options);
  }

  /**
   * Subscribes to devtools changes.
   *
   * @param subscriber - Listener invoked after entries or snapshots change.
   * @returns Subscription handle.
   */
  subscribe(subscriber: QuireDevtoolsSubscriber): QuireDevtoolsSubscription {
    this.subscribers.add(subscriber);
    return {
      unsubscribe: () => {
        this.subscribers.delete(subscriber);
      }
    };
  }

  /**
   * Mounts the framework-neutral devtools panel.
   *
   * @param element - Host element that receives the panel mount root.
   * @returns Mounted panel handle.
   */
  mountPanel(_element: HTMLElement): QuireDevtoolsMount {
    return mountQuireDevtoolsPanel(this, _element);
  }

  /**
   * Attaches an editor to the devtools instance.
   *
   * @param editor - Editor to inspect.
   */
  attachEditor(editor: QuireEditor): void {
    this.editor = editor;
    this.notify();
  }

  /** Clears the attached editor, entries, and panel state. */
  destroy(): void {
    this.detachEditor();
    this.interactionTraces.destroy();
    this.recorderSubscription.unsubscribe();
    this.recorder.destroy();
    this.subscribers.clear();
    this.previousRenderCacheCountersByView.clear();
    this.latestRender = undefined;
    this.latestInteraction = undefined;
  }

  /** Clears the current editor reference and notifies subscribers. */
  private detachEditor(): void {
    this.editor = undefined;
    this.notify();
  }

  /** Notifies current subscribers. */
  private notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber();
    }
  }

  /**
   * Reads the editor attached by the extension lifecycle.
   *
   * @returns Attached editor instance.
   */
  private requireAttachedEditor(): QuireEditor {
    if (!this.editor) {
      throw new Error("Quire devtools extension dispatched before editor attach.");
    }

    return this.editor;
  }
}

/**
 * Attaches a per-render cache counter delta to a render summary.
 *
 * @param render - Render summary produced from a mounted view event.
 * @param previousByView - Previous cumulative counters keyed by view identity.
 * @returns Render summary with an optional per-render cache delta.
 */
function attachRenderCacheCounterDelta(
  render: QuireDevtoolsRenderSummary,
  previousByView: Map<string, QuireViewRenderCacheCounters>
): QuireDevtoolsRenderSummary {
  if (render.cacheCounters === undefined) {
    return render;
  }

  const key = createRenderCacheCounterKey(render);
  const previous = previousByView.get(key);
  previousByView.set(key, render.cacheCounters);

  return {
    ...render,
    cacheCounterDelta: diffRenderCacheCounters(previous, render.cacheCounters)
  };
}

/**
 * Creates a stable key for render cache counter baselines.
 *
 * @param render - Render summary that owns the cache counters.
 * @returns Stable key for one mounted view mode.
 */
function createRenderCacheCounterKey(render: QuireDevtoolsRenderSummary): string {
  return `${render.mode}\u0000${render.viewId}`;
}

/**
 * Computes per-render cache counter changes from cumulative snapshots.
 *
 * @param previous - Previous cumulative counters for the same mounted view.
 * @param current - Current cumulative counters for the same mounted view.
 * @returns Counter deltas for the current render pass.
 */
function diffRenderCacheCounters(
  previous: QuireViewRenderCacheCounters | undefined,
  current: QuireViewRenderCacheCounters
): QuireViewRenderCacheCounters {
  const currentLayoutProduct = current.layoutProduct ?? {
    rebuilt: 0,
    reused: 0,
    fallbackReason: "unavailable"
  };
  return {
    layoutProduct: {
      rebuilt: diffCounter(
        previous?.layoutProduct?.rebuilt,
        currentLayoutProduct.rebuilt
      ),
      reused: diffCounter(
        previous?.layoutProduct?.reused,
        currentLayoutProduct.reused
      ),
      fallbackReason: currentLayoutProduct.fallbackReason
    },
    retainedBlock: {
      commits: diffCounter(previous?.retainedBlock.commits, current.retainedBlock.commits),
      reconciledRecords: diffCounter(
        previous?.retainedBlock.reconciledRecords,
        current.retainedBlock.reconciledRecords
      ),
      rebuiltRecords: diffCounter(
        previous?.retainedBlock.rebuiltRecords,
        current.retainedBlock.rebuiltRecords
      ),
      reusedRecords: diffCounter(
        previous?.retainedBlock.reusedRecords,
        current.retainedBlock.reusedRecords
      ),
      projectedRecords: diffCounter(
        previous?.retainedBlock.projectedRecords,
        current.retainedBlock.projectedRecords
      ),
      removedRecords: diffCounter(
        previous?.retainedBlock.removedRecords,
        current.retainedBlock.removedRecords
      ),
      heightIndexRebuilds: diffCounter(
        previous?.retainedBlock.heightIndexRebuilds,
        current.retainedBlock.heightIndexRebuilds
      ),
      heightIndexDeltaBatches: diffCounter(
        previous?.retainedBlock.heightIndexDeltaBatches,
        current.retainedBlock.heightIndexDeltaBatches
      ),
      heightIndexUpdatedEntries: diffCounter(
        previous?.retainedBlock.heightIndexUpdatedEntries,
        current.retainedBlock.heightIndexUpdatedEntries
      ),
      heightIndexQueries: diffCounter(
        previous?.retainedBlock.heightIndexQueries,
        current.retainedBlock.heightIndexQueries
      ),
      debugFlowComparisons: diffCounter(
        previous?.retainedBlock.debugFlowComparisons,
        current.retainedBlock.debugFlowComparisons
      ),
      providerExecution: {
        snapshotEpochs: diffCounter(
          previous?.retainedBlock.providerExecution.snapshotEpochs,
          current.retainedBlock.providerExecution.snapshotEpochs
        ),
        openedExecutions: diffCounter(
          previous?.retainedBlock.providerExecution.openedExecutions,
          current.retainedBlock.providerExecution.openedExecutions
        ),
        suppliedContinuations: diffCounter(
          previous?.retainedBlock.providerExecution.suppliedContinuations,
          current.retainedBlock.providerExecution.suppliedContinuations
        ),
        committedContinuations: diffCounter(
          previous?.retainedBlock.providerExecution.committedContinuations,
          current.retainedBlock.providerExecution.committedContinuations
        ),
        discardedContinuations: diffCounter(
          previous?.retainedBlock.providerExecution.discardedContinuations,
          current.retainedBlock.providerExecution.discardedContinuations
        ),
        canceledJobs: diffCounter(
          previous?.retainedBlock.providerExecution.canceledJobs,
          current.retainedBlock.providerExecution.canceledJobs
        )
      }
    },
    blockShape: {
      fragmentHits: diffCounter(previous?.blockShape.fragmentHits, current.blockShape.fragmentHits),
      fragmentMisses: diffCounter(
        previous?.blockShape.fragmentMisses,
        current.blockShape.fragmentMisses
      ),
      fragmentStores: diffCounter(
        previous?.blockShape.fragmentStores,
        current.blockShape.fragmentStores
      ),
      inputHits: diffCounter(previous?.blockShape.inputHits, current.blockShape.inputHits),
      inputMisses: diffCounter(
        previous?.blockShape.inputMisses,
        current.blockShape.inputMisses
      ),
      inputStores: diffCounter(
        previous?.blockShape.inputStores,
        current.blockShape.inputStores
      ),
      topLevelInputExactHits: diffCounter(
        previous?.blockShape.topLevelInputExactHits,
        current.blockShape.topLevelInputExactHits
      ),
      topLevelInputShiftHits: diffCounter(
        previous?.blockShape.topLevelInputShiftHits,
        current.blockShape.topLevelInputShiftHits
      ),
      topLevelInputMisses: diffCounter(
        previous?.blockShape.topLevelInputMisses,
        current.blockShape.topLevelInputMisses
      ),
      topLevelInputStores: diffCounter(
        previous?.blockShape.topLevelInputStores,
        current.blockShape.topLevelInputStores
      ),
      localShapeHits: diffCounter(
        previous?.blockShape.localShapeHits,
        current.blockShape.localShapeHits
      ),
      localShapeMisses: diffCounter(
        previous?.blockShape.localShapeMisses,
        current.blockShape.localShapeMisses
      ),
      localShapeStores: diffCounter(
        previous?.blockShape.localShapeStores,
        current.blockShape.localShapeStores
      ),
      localShapeSuffixHits: diffCounter(
        previous?.blockShape.localShapeSuffixHits,
        current.blockShape.localShapeSuffixHits
      ),
      localShapeConvergedSuffixHits: diffCounter(
        previous?.blockShape.localShapeConvergedSuffixHits,
        current.blockShape.localShapeConvergedSuffixHits
      ),
      localShapeConvergenceMisses: diffCounter(
        previous?.blockShape.localShapeConvergenceMisses,
        current.blockShape.localShapeConvergenceMisses
      ),
      localShapeReuseMisses: diffCounter(
        previous?.blockShape.localShapeReuseMisses,
        current.blockShape.localShapeReuseMisses
      ),
      localShapeBypassComposition: diffCounter(
        previous?.blockShape.localShapeBypassComposition,
        current.blockShape.localShapeBypassComposition ?? 0
      ),
      localShapeBypassMultiRun: diffCounter(
        previous?.blockShape.localShapeBypassMultiRun,
        current.blockShape.localShapeBypassMultiRun ?? 0
      ),
      localShapeBypassFragmentHit: diffCounter(
        previous?.blockShape.localShapeBypassFragmentHit,
        current.blockShape.localShapeBypassFragmentHit ?? 0
      ),
      localShapeBypassTextblockInputHit: diffCounter(
        previous?.blockShape.localShapeBypassTextblockInputHit,
        current.blockShape.localShapeBypassTextblockInputHit ?? 0
      ),
      localShapeBypassTopLevelInputHit: diffCounter(
        previous?.blockShape.localShapeBypassTopLevelInputHit,
        current.blockShape.localShapeBypassTopLevelInputHit ?? 0
      ),
      localShapeBypassEstimated: diffCounter(
        previous?.blockShape.localShapeBypassEstimated,
        current.blockShape.localShapeBypassEstimated ?? 0
      ),
    },
    measuredSource: {
      hits: diffCounter(previous?.measuredSource.hits, current.measuredSource.hits),
      exactHits: diffCounter(
        previous?.measuredSource.exactHits,
        current.measuredSource.exactHits
      ),
      shiftedTextHits: diffCounter(
        previous?.measuredSource.shiftedTextHits,
        current.measuredSource.shiftedTextHits
      ),
      shiftedLeafHits: diffCounter(
        previous?.measuredSource.shiftedLeafHits,
        current.measuredSource.shiftedLeafHits
      ),
      misses: diffCounter(previous?.measuredSource.misses, current.measuredSource.misses),
      stores: diffCounter(previous?.measuredSource.stores, current.measuredSource.stores),
      textPrefixHits: diffCounter(
        previous?.measuredSource.textPrefixHits,
        current.measuredSource.textPrefixHits
      ),
      textPrefixMisses: diffCounter(
        previous?.measuredSource.textPrefixMisses,
        current.measuredSource.textPrefixMisses
      ),
      textPrefixReusedItems: diffCounter(
        previous?.measuredSource.textPrefixReusedItems,
        current.measuredSource.textPrefixReusedItems
      ),
      bodyPrefixHits: diffCounter(
        previous?.measuredSource.bodyPrefixHits,
        current.measuredSource.bodyPrefixHits
      ),
      bodyPrefixMisses: diffCounter(
        previous?.measuredSource.bodyPrefixMisses,
        current.measuredSource.bodyPrefixMisses
      ),
      bodyPrefixReusedItems: diffCounter(
        previous?.measuredSource.bodyPrefixReusedItems,
        current.measuredSource.bodyPrefixReusedItems
      ),
      bodySuffixHits: diffCounter(
        previous?.measuredSource.bodySuffixHits,
        current.measuredSource.bodySuffixHits
      ),
      bodySuffixMisses: diffCounter(
        previous?.measuredSource.bodySuffixMisses,
        current.measuredSource.bodySuffixMisses
      ),
      bodySuffixReusedItems: diffCounter(
        previous?.measuredSource.bodySuffixReusedItems,
        current.measuredSource.bodySuffixReusedItems
      )
    },
    paginationCheckpoint: {
      prefixHits: diffCounter(
        previous?.paginationCheckpoint.prefixHits,
        current.paginationCheckpoint.prefixHits
      ),
      prefixMisses: diffCounter(
        previous?.paginationCheckpoint.prefixMisses,
        current.paginationCheckpoint.prefixMisses
      ),
      prefixPagesReused: diffCounter(
        previous?.paginationCheckpoint.prefixPagesReused,
        current.paginationCheckpoint.prefixPagesReused
      ),
      convergenceHits: diffCounter(
        previous?.paginationCheckpoint.convergenceHits,
        current.paginationCheckpoint.convergenceHits
      ),
      convergenceMisses: diffCounter(
        previous?.paginationCheckpoint.convergenceMisses,
        current.paginationCheckpoint.convergenceMisses
      ),
      suffixPagesReused: diffCounter(
        previous?.paginationCheckpoint.suffixPagesReused,
        current.paginationCheckpoint.suffixPagesReused
      ),
      pagesRecomputed: diffCounter(
        previous?.paginationCheckpoint.pagesRecomputed,
        current.paginationCheckpoint.pagesRecomputed
      ),
      stores: diffCounter(
        previous?.paginationCheckpoint.stores,
        current.paginationCheckpoint.stores
      )
    },
    displayCommand: {
      hits: diffCounter(previous?.displayCommand.hits, current.displayCommand.hits),
      identityHits: diffCounter(
        previous?.displayCommand.identityHits,
        current.displayCommand.identityHits
      ),
      identityShiftHits: diffCounter(
        previous?.displayCommand.identityShiftHits,
        current.displayCommand.identityShiftHits
      ),
      shiftSignatureHits: diffCounter(
        previous?.displayCommand.shiftSignatureHits,
        current.displayCommand.shiftSignatureHits
      ),
      sourceShiftHits: diffCounter(
        previous?.displayCommand.sourceShiftHits,
        current.displayCommand.sourceShiftHits
      ),
      textNodeHits: diffCounter(
        previous?.displayCommand.textNodeHits,
        current.displayCommand.textNodeHits
      ),
      textNodeMisses: diffCounter(
        previous?.displayCommand.textNodeMisses,
        current.displayCommand.textNodeMisses
      ),
      textNodeStores: diffCounter(
        previous?.displayCommand.textNodeStores,
        current.displayCommand.textNodeStores
      ),
      misses: diffCounter(previous?.displayCommand.misses, current.displayCommand.misses),
      stores: diffCounter(previous?.displayCommand.stores, current.displayCommand.stores)
    }
  };
}

/**
 * Computes one monotonic counter delta.
 *
 * @param previous - Previous counter value, if available.
 * @param current - Current counter value.
 * @returns Counter delta, or the current value when the counter reset.
 */
function diffCounter(previous: number | undefined, current: number): number {
  if (previous === undefined || current < previous) {
    return current;
  }

  return current - previous;
}

/**
 * Creates a QuireKit devtools runtime.
 *
 * @param options - Devtools options.
 * @returns Devtools instance.
 */
export function createQuireDevtools(
  options: QuireDevtoolsOptions = {}
): QuireDevtools {
  return new QuireDevtoolsRuntime(options);
}
