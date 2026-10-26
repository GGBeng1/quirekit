import type { QuireKitTaskCloseRequest, QuireKitTaskPresentation } from "../task/types";
import type { QuireKitPopoverPlacement } from "../popover/types";

/** Composable task shell; business drafts and page navigation belong to the caller. */
export interface QuireKitTaskPanelProps {
  /** Accessible title of the current task page. */ readonly title: string;
  /** Controlled opening request. */ readonly open?: boolean | undefined;
  /** Initial uncontrolled request. */ readonly defaultOpen?: boolean | undefined;
  /** Authoritatively ends an unavailable task. */ readonly disabled?: boolean | undefined;
  /** Opening-time shell strategy, locked until physical exit. */ readonly presentation?: QuireKitTaskPresentation | undefined;
  /** Current operation prevents user dismissal while it completes. */ readonly busy?: boolean | undefined;
  /** Shows the parent-page return action. */ readonly canGoBack?: boolean | undefined;
  /** Explicit anchor for programmatic openings without a trigger slot. */ readonly anchorEl?: (() => HTMLElement | null) | undefined;
  /** Explicit destination after exit; otherwise returns to the actual trigger. */ readonly finalFocusEl?: (() => HTMLElement | null) | undefined;
  /** Receiver owns focus when this task hands off to another workspace. */ readonly restoreFocus?: boolean | undefined;
  /** Synchronous host close policy. */ readonly onCloseRequest?: ((request: QuireKitTaskCloseRequest) => void) | undefined;
  /** Desktop placement relative to the original entry. */ readonly placement?: QuireKitPopoverPlacement | undefined;
  /** Desktop width in CSS pixels or a CSS expression. */ readonly width?: number | string | undefined;
  /** Optional bottom-panel CSS height limit, additionally clamped to the visible owner viewport. */ readonly maxHeight?: string | undefined;
  /** Portal in the owning document; defaults to its body. */ readonly portalTarget?: string | HTMLElement | undefined;
}
