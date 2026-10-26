import type { QuireKitActionSheetAction } from "../action-sheet/types";
import type { QuireKitTaskCloseRequest, QuireKitTaskPresentation, QuireKitTaskRequestContext } from "../task/types";

/** Same action directory presented as an anchored menu or a bottom task. */
export interface QuireKitActionMenuProps {
  /** Visible task title and accessible name. */
  readonly title: string;
  /** Optional explanation of the task. */
  readonly description?: string | undefined;
  /** Immutable action tree with globally unique non-empty values. */
  readonly actions: readonly QuireKitActionMenuEntry[];
  /** Bottom directory layout; desktop keeps native menu navigation. */
  readonly layout?: "list" | "grid" | undefined;
  /** Shows a bottom-directory search field without autofocus. */
  readonly searchable?: boolean | undefined;
  /** Opening-time presentation strategy. */
  readonly presentation?: QuireKitTaskPresentation | undefined;
  /** Controlled open request; undefined enables local ownership. */
  readonly open?: boolean | undefined;
  /** Initial uncontrolled open request. */
  readonly defaultOpen?: boolean | undefined;
  /** Prevents opening and authoritatively ends any current task. */
  readonly disabled?: boolean | undefined;
  /** Task-specific explanation shown after execute rejects; defaults to the language pack's generic text. */
  readonly errorText?: string | undefined;
  /** Accessible name of an optional non-interactive context region. */
  readonly contextLabel?: string | undefined;
  /** Explicit final focus; otherwise returns to this session's real opener. */
  readonly finalFocusEl?: (() => HTMLElement | null) | undefined;
  /** Synchronous cancellable user-close callback. */
  readonly onCloseRequest?: ((request: QuireKitTaskCloseRequest) => void) | undefined;
  /**
   * Sole business execution entry; action is a success notification.
   * @param request - Stable command/path identity with session cancellation.
   * @returns Completion, optionally asynchronous; rejecting preserves the current task for retry.
   */
  readonly execute?: ((request: QuireKitActionMenuRequest) => void | Promise<void>) | undefined;
}

/** Executable leaf of a shared action directory. */
export interface QuireKitActionMenuCommand extends QuireKitActionSheetAction {
  /** A command runs the task's execute callback. */
  readonly kind: "command";
  /** Commands never own a child directory. */
  readonly children?: never;
}

/** Navigable branch; entering it does not execute an action. */
export interface QuireKitActionMenuBranch extends QuireKitActionSheetAction {
  /** A branch reveals its child actions. */
  readonly kind: "branch";
  /** Ordered child directory; an empty directory retains a return path. */
  readonly children: readonly QuireKitActionMenuEntry[];
}

/** One immutable command or branch with an identity unique across the complete tree. */
export type QuireKitActionMenuEntry = QuireKitActionMenuCommand | QuireKitActionMenuBranch;

/** Business request for one executable leaf in the current task session. */
export interface QuireKitActionMenuRequest extends QuireKitTaskRequestContext {
  /** Stable command identity. */
  readonly value: string;
  /** Ancestor branch identities, from the root to the command's parent. */
  readonly path: readonly string[];
}

/** Notification emitted after the current execute callback succeeds. */
export interface QuireKitActionMenuActionDetails {
  /** Successfully executed command. */
  readonly value: string;
  /** Ancestor branch path captured for that execution. */
  readonly path: readonly string[];
  /** Session that accepted the command. */
  readonly sessionId: string;
}

/** Decoration slot shared by desktop and bottom action rows. */
export interface QuireKitActionMenuIconSlotProps {
  /** Current immutable command or branch. */
  readonly action: QuireKitActionMenuEntry;
}

/** Composable action directory; activation is an intent, never a business submission. */
export interface QuireKitActionDirectoryProps {
  /** Current immutable directory level. */ readonly actions: readonly QuireKitActionMenuEntry[];
  /** List or two-column action tiles. */ readonly layout?: "list" | "grid" | undefined;
  /** Show the accessible search field. */ readonly searchable?: boolean | undefined;
  /** Query examples shown inside the field; its accessible label remains separate. */ readonly searchPlaceholder?: string | undefined;
  /** Controlled full query; omission retains local input. */ readonly query?: string | undefined;
  /** Prevent action activation without removing keyboard focus. */ readonly busy?: boolean | undefined;
  /** Optional product alias matching. @param action - Current entry. @param query - Complete query. @returns Whether the entry matches. */
  readonly filter?: ((action: QuireKitActionMenuEntry, query: string) => boolean) | undefined;
}

/** Composable directory decorations; actions remain a single button. */
export interface QuireKitActionDirectorySlots {
  /** Decorative icon content, sharing ActionMenu's identity contract. */ readonly icon?: (props: QuireKitActionMenuIconSlotProps) => unknown;
}
