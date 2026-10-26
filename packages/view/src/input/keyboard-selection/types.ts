import type { EditorState } from "@quirekit/pm";
import type { QuireTableModelProfile } from "@quirekit/view-engine";
import type {
  QuireKeyboardInputEvent,
  QuireLineBoundaryPositionResolver,
  QuireVerticalCaretPositionResolver
} from "../types";
import type { QuireStoryCommandBoundary } from "../story-boundary";
import type { QuireSelectionScopeBoundary } from "../selection-scope";

/** Options used to resolve a keyboard selection transaction. */
export interface QuireKeyboardSelectionTransactionOptions {
  /** Editor state whose current selection receives keyboard navigation. */
  readonly state: EditorState;
  /** Keyboard event-like object that describes the requested selection movement. */
  readonly event: QuireKeyboardInputEvent;
  /** Optional layout-aware resolver for ArrowUp and ArrowDown movement. */
  readonly resolveVerticalCaretPosition?:
    | QuireVerticalCaretPositionResolver
    | undefined;
  /** Optional layout-aware resolver for Home and End visual-line boundaries. */
  readonly resolveLineBoundaryPosition?: QuireLineBoundaryPositionResolver | undefined;
  /** Optional active header/footer boundary retained for story command guards. */
  readonly storyCommandBoundary?: QuireStoryCommandBoundary | undefined;
  /** Optional active body or story boundary that scopes all selection movement. */
  readonly selectionScopeBoundary?: QuireSelectionScopeBoundary | undefined;
  /** Table model driving cell-boundary navigation; the neutral model has no tables. */
  readonly tableModel?: QuireTableModelProfile | undefined;
}
