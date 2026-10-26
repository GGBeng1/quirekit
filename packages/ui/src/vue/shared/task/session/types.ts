import type { ComputedRef, Ref } from "vue";
import type { QuireKitTaskApi, QuireKitTaskCancelReason, QuireKitTaskCloseReason, QuireKitTaskCloseRequest } from "../../../../components/task";
import type { TaskRequests } from "./request-types";

/** Reactive public settings consumed by the private task lifecycle. */
export interface TaskLifecycleProps {
  /** Host-owned request; undefined enables the local request. */
  readonly open?: boolean | undefined;
  /** Initial local request, consumed once. */
  readonly defaultOpen?: boolean | undefined;
  /** Authoritatively suspends the active task. */
  readonly disabled?: boolean | undefined;
  /** Host guard invoked after the task's synchronous submission guard. */
  readonly onCloseRequest?: ((request: QuireKitTaskCloseRequest) => void) | undefined;
}

/** Minimal presentation operations required by the session owner. */
export interface TaskLifecyclePresentation {
  /** Whether the correct surface can be resolved in this environment. */
  readonly ready: Readonly<Ref<boolean>>;
  /** Locks the currently resolved presentation for this opening cycle. @returns The locked surface when ready. */
  open(): "desktop" | "bottom" | undefined;
  /** Retains the lock while the surface exits. */
  close(): void;
}

/** Notifications emitted only by the single accepted task lifecycle. */
export interface TaskLifecycleEvents {
  /** Requests host acknowledgement. @param open - Requested state. */
  updateOpen(open: boolean): void;
  /** Reports an effective session transition. @param open - Actual session state. */
  openChange(open: boolean): void;
  /** Initializes task-owned drafts. @param sessionId - New effective session. */
  begin(sessionId: string): void;
  /** Discards private drafts on any session end. @param sessionId - Ended session. */
  end(sessionId: string): void;
  /** Reports discarded uncommitted work. @param details - Actual end reason and session. */
  cancel(details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }): void;
}

/** Dependencies owned outside the task's two sibling surface providers. */
export interface TaskLifecycleOptions {
  /** Reactive public settings. */
  readonly props: TaskLifecycleProps;
  /** Actual parent's readiness; never the task's own inactive Drawer. */
  readonly ownerReady: Readonly<Ref<boolean>>;
  /** Opening-time presentation lock. */
  readonly presentation: TaskLifecyclePresentation;
  /** Independent submission and search invalidation channels. */
  readonly requests: TaskRequests;
  /** Single set of task notifications. */
  readonly events: TaskLifecycleEvents;
}

/** Private task entries used by the stable trigger and guarded surface adapters. */
export interface TaskLifecycle extends QuireKitTaskApi {
  /** Consumer's request, retained while its parent is hidden. */
  readonly requestedOpen: ComputedRef<boolean>;
  /** Actual environment/owner/disabled-gated state supplied to surface machines. */
  readonly open: ComputedRef<boolean>;
  /** Accepts an opening request from the active machine. @returns Whether opening is currently available. */
  requestOpen(): boolean;
  /** Checks an existing Drawer close intent without recursively closing. @param request - Original intent. */
  guardClose(request: QuireKitTaskCloseRequest): void;
  /** Consumes the already-guarded Drawer update once. @param reason - Validated reason. */
  acceptClose(reason: QuireKitTaskCloseReason): void;
}
