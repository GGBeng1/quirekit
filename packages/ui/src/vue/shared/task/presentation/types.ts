import type { ComputedRef, Ref, ShallowRef } from "vue";
import type { QuireKitResolvedTaskPresentation } from "../../../../components/task/types";

/** Physical surface lifetime, independent from the task's logical session. */
export type TaskPresentationPhase = "closed" | "open" | "closing";

/** Private adaptive shell state consumed by a task's stable trigger and providers. */
export interface AdaptivePresentation {
  /** Whether a requested session can resolve its shell without guessing the viewport. */
  readonly ready: ComputedRef<boolean>;
  /** Next shell requested by the current host strategy and document viewport. */
  readonly candidate: ComputedRef<QuireKitResolvedTaskPresentation | undefined>;
  /** Candidate while closed, or the shell locked through its complete physical exit. */
  readonly resolved: ComputedRef<QuireKitResolvedTaskPresentation | undefined>;
  /** Physical lifetime; open includes the entering animation. */
  readonly phase: ComputedRef<TaskPresentationPhase>;
  /** Monotonic opening identity used to reject stale provider exit notifications. */
  readonly epoch: ComputedRef<number>;
  /**
   * Refreshes document media synchronously without accepting or locking a session.
   * @param event - Original trigger interaction, including its owner document.
   * @returns Locked shell, or the refreshed candidate when closed.
   */
  resolveForEvent(event: Event): QuireKitResolvedTaskPresentation | undefined;
  /**
   * Locks the shell when the task's effective session actually starts.
   * @returns Active shell, or undefined while the environment is unavailable.
   */
  open(): QuireKitResolvedTaskPresentation | undefined;
  /** Starts physical exit while retaining the active shell. */
  close(): void;
  /**
   * Releases only the current exiting provider's shell lock.
   * @param presentation - Provider that completed its exit.
   * @param epoch - Opening identity captured by that provider's exit handler.
   * @returns Whether this notification completed the current physical exit.
   */
  completeExit(presentation: QuireKitResolvedTaskPresentation, epoch: number): boolean;
  /** Releases subscriptions and invalidates outstanding work immediately. */
  dispose(): void;
}

/** One consumer's lease on its document's shared layout media subscription. */
export interface TaskPresentationMedia {
  /** Shared reactive snapshot, refreshed by media changes or a trigger interaction. */
  readonly value: Readonly<Ref<QuireKitResolvedTaskPresentation>>;
  /**
   * Reads current layout media before a potentially delayed change notification.
   * @returns Current concrete viewport presentation.
   */
  refresh(): QuireKitResolvedTaskPresentation;
  /** Releases this lease once, removing the browser listener for the final consumer. */
  release(): void;
}

/** Registry entry owned by one document and shared only while consumers exist. */
export interface TaskPresentationMediaEntry {
  /** Document-specific layout viewport query. */
  readonly query: MediaQueryList;
  /** Shared current result of that query. */
  readonly value: ShallowRef<QuireKitResolvedTaskPresentation>;
  /** Listener identity used for symmetric subscription cleanup. */
  readonly onChange: () => void;
  /** Number of live, independently releasable leases. */
  consumers: number;
}
