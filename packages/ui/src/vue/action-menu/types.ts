import type { QuireKitActionMenuActionDetails, QuireKitActionMenuEntry, QuireKitActionMenuRequest } from "../../components/action-menu";
import type { QuireKitTaskCancelReason } from "../../components/task";

/** Single notification owner supplied by the public component. */
export interface ActionMenuCallbacks {
  /** @param open - Requested controlled state. */
  updateOpen(open: boolean): void;
  /** @param open - Actual effective session state. */
  openChange(open: boolean): void;
  /** @param details - Actual cancellation source and session. */
  cancel(details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }): void;
  /** @param details - Successful command notification. */
  action(details: QuireKitActionMenuActionDetails): void;
  /** @param details - Host-visible error for the current request. */
  error(details: { readonly error: unknown; readonly request: QuireKitActionMenuRequest }): void;
}

/** Resolved action location used to recheck live ancestors before execution. */
export interface ActionMenuLocation {
  /** Current item object from the host's directory. */
  readonly action: QuireKitActionMenuEntry;
  /** Ancestors in root-to-parent order. */
  readonly path: readonly string[];
  /** Whether the item or any ancestor is disabled. */
  readonly disabled: boolean;
}

/** Closest currently available directory for a requested bottom path. */
export interface ActionMenuLevel {
  /** Valid prefix of the requested branch path. */
  readonly path: readonly string[];
  /** Current directory actions in host order. */
  readonly actions: readonly QuireKitActionMenuEntry[];
  /** Current branch, absent at the root. */
  readonly branch: QuireKitActionMenuEntry | undefined;
}

/** Adjacent action group without changing the original directory order. */
export interface ActionMenuGroup {
  /** Optional visible group heading. */
  readonly label: string | undefined;
  /** Ordered commands and branches in the run. */
  readonly actions: QuireKitActionMenuEntry[];
}

/** Bottom view snapshot retained by the path owner. */
export interface ActionMenuView {
  /** Complete parent query; omitted by directories without search. */
  readonly query?: string;
  /** Scroll offset of the current directory body. */
  readonly scrollTop: number;
  /** Action that should regain focus on return. */
  readonly focusedValue: string | null;
}

/** Private bottom presentation handle. */
export interface ActionMenuBottomApi {
  /** @returns Current directory scroll and action focus. */
  captureView(): ActionMenuView;
  /** @param view - Previous directory view. @returns Completion after the directory renders and focus is restored. */
  restoreView(view: ActionMenuView): Promise<void>;
}
