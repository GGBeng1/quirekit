import { EditorSelection, Transaction, type SelectionRange } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { sourceInputElement } from "@quirekit/msfe-core";
import type { QuireKitSelectionHandleDrag, QuireKitSelectionHandleNudge, QuireKitSelectionHandlePoint } from "@quirekit/ui";
import { mobilePosition } from "./geometry";
import type { MobileSelectionSession } from "./types";

/** Bounded native selection transactions; source, input and history remain CodeMirror-owned. */
export class MobileSelectionInteraction {
  private session: MobileSelectionSession | undefined;

  /** @param view - Native editor authority. @param enabled - Current input ownership guard. */
  constructor(private readonly view: EditorView, private readonly enabled: () => boolean) {}

  /** Discard only transient gesture targets, retaining every accepted selection. */
  cancel(): void { this.session = undefined; }

  /** @param detail - Public endpoint acquired before any coordinate is applied. */
  begin(detail: QuireKitSelectionHandleDrag): void {
    if (this.enabled()) this.session = { handle: detail.handle, range: this.view.state.selection.main };
  }

  /** Arm caret extension from its exact native position without selecting a word or dispatching a transaction. */
  holdCaret(): void {
    if (!this.enabled()) return;
    const range = this.view.state.selection.main;
    if (range.empty) this.session = { handle: "focus", range };
  }

  /** @param point - Accepted body-text hold; arm the exact visible caret without preselecting a word. */
  hold(point: QuireKitSelectionHandlePoint): void {
    if (!this.enabled()) return;
    const pos = mobilePosition(this.view, point);
    if (pos === null) return;
    const range = EditorSelection.cursor(pos);
    this.session = { handle: "focus", range };
    this.commit(pos, pos);
  }

  /** @param point - Latest adjusted client sample; the public primitive coalesces frames. */
  move(point: QuireKitSelectionHandlePoint): void {
    if (!this.enabled() || !this.session) return;
    const pos = mobilePosition(this.view, point);
    if (pos === null) return;
    const next = mobileDragRange(this.session, pos);
    this.commit(next.anchor, next.head);
  }

  /** @param intent - Physical arrow; CodeMirror owns graphemes, bidi and visual lines. */
  nudge(intent: QuireKitSelectionHandleNudge): void {
    if (!this.enabled()) return;
    const range = this.view.state.selection.main;
    const pos = intent.handle === "anchor" ? range.anchor : range.head;
    const start = EditorSelection.cursor(pos);
    const forward = intent.direction === "right" || intent.direction === "down";
    const next = intent.direction === "up" || intent.direction === "down"
      ? this.view.moveVertically(start, forward, intent.accelerated ? this.view.defaultLineHeight * 3 : undefined)
      : intent.accelerated ? this.view.moveByGroup(start, forward) : this.view.moveByChar(start, forward);
    const result = mobileDragRange({ handle: intent.handle, range }, next.head);
    this.commit(result.anchor, result.head);
  }

  /** @param anchor - Stable directed anchor. @param head - Accepted moving endpoint. */
  private commit(anchor: number, head: number): void {
    const current = this.view.state.selection.main;
    if (current.anchor === anchor && current.head === head) return;
    this.view.dispatch({ selection: this.view.state.selection.replaceRange(EditorSelection.range(anchor, head)),
      // Native CM pointer selection deliberately installs a browser Range. An
      // isolated keyboard host must keep the logical endpoint in state only.
      annotations: Transaction.addToHistory.of(false), userEvent: sourceInputElement(this.view) === this.view.contentDOM ? "select.pointer" : "select" });
  }
}

/**
 * Resolve a captured endpoint without swapping identity when it crosses the other.
 * @param session - Captured directed source range.
 * @param pos - Latest accepted native position.
 * @returns Directed canonical selection, including an intentionally collapsed caret.
 */
export function mobileDragRange(session: MobileSelectionSession, pos: number): SelectionRange {
  const { handle, range } = session;
  return handle === "caret" ? EditorSelection.cursor(pos)
    : handle === "anchor" ? EditorSelection.range(pos, range.head) : EditorSelection.range(range.anchor, pos);
}
