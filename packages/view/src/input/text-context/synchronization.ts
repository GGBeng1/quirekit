import type { EditorState } from "@quirekit/pm";
import type { QuireNativeTextContext, QuireTextContextProvider } from "./types";

/** Maintains one version-bound native value without rewriting stable selections. */
export class NativeTextContextSynchronization {
  private state: EditorState | undefined;
  private contextValue: QuireNativeTextContext | null = null;

  /** @param input - View-owned textarea. @param provider - Bounded context compiler. */
  constructor(private readonly input: HTMLTextAreaElement, private readonly provider: QuireTextContextProvider) {}

  /** @returns Last context written into the native host. */
  get context(): QuireNativeTextContext | null { return this.contextValue; }

  /**
   * Compiles only changed document/selection dependencies and restores browser text.
   * @param state - Current accepted editor state.
   */
  sync(state: EditorState): void {
    if (!this.state || this.state.doc !== state.doc || !this.state.selection.eq(state.selection)) {
      this.contextValue = validateContext(this.provider.read(state), state);
      this.state = state;
    }
    const context = this.contextValue;
    if (this.provider.unavailableDescription !== undefined) {
      const description = context ? "" : this.provider.unavailableDescription;
      if (this.input.getAttribute("aria-description") !== description) this.input.setAttribute("aria-description", description);
    }
    const value = context?.text ?? "";
    if (this.input.value !== value) this.input.value = value;
    const anchor = context?.anchor ?? 0;
    const head = context?.head ?? 0;
    const start = Math.min(anchor, head);
    const end = Math.max(anchor, head);
    const direction = anchor > head ? "backward" : "forward";
    if (this.input.selectionStart !== start || this.input.selectionEnd !== end
      || (start !== end && this.input.selectionDirection !== direction)) {
      this.input.setSelectionRange(start, end, direction);
    }
  }
}

/**
 * Refuses a partial selection or a context compiled against a different document.
 * @param context - Proposed text window.
 * @param state - Current canonical selection.
 * @returns Validated context, or null rather than a silently clamped selection.
 */
function validateContext(context: QuireNativeTextContext | null, state: EditorState): QuireNativeTextContext | null {
  if (context === null) return null;
  if (context.doc !== state.doc || context.positions.length !== context.text.length + 1
    || context.positions[context.anchor] !== state.selection.anchor
    || context.positions[context.head] !== state.selection.head) return null;
  let previous = -1;
  for (const position of context.positions) {
    if (position === null) continue;
    if (!Number.isInteger(position) || position < 0 || position < previous || position > state.doc.content.size) return null;
    previous = position;
  }
  return context;
}
