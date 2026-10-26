import { forceParsing, syntaxTree } from "@quirekit/cm-language";
import { ViewPlugin, type EditorView, type ViewUpdate } from "@quirekit/cm-view";
import type { Text } from "@quirekit/cm-state";
import { compositionField } from "../../state/fields";
import { revealSelectionField } from "../../presentation/gesture";
import { observeMarkdownParse, requestMarkdownParse } from "./demand";
import { referencesPending } from "../../markdown/parsing/references";

/** Advances the existing parser only when a mounted semantic consumer needs offscreen definitions. */
class DemandParser {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private requested: Text | undefined;
  private stop: (() => void) | undefined;
  private destroyed = false;

  /** @param view - Sole mounted source and parser owner. */
  constructor(private readonly view: EditorView) { this.observe(); }

  /** @param update - Accepted state, including document replacement or completed composition/gesture. */
  update(update: ViewUpdate): void {
    if (update.state !== update.startState) this.observe();
  }

  /** Rebinds demand to the accepted snapshot; replacement abandons previous-document work. */
  private observe(): void {
    this.stop?.();
    const { state } = this.view;
    if (this.requested !== state.doc) { this.requested = undefined; this.cancel(); }
    this.stop = observeMarkdownParse(state, () => { this.requested = state.doc; this.schedule(); });
    if (referencesPending(syntaxTree(state))) requestMarkdownParse(state);
    this.schedule();
  }

  /** @returns Whether native input or a pointer gesture currently owns stable presentation. */
  private paused(): boolean {
    return !!this.view.state.field(compositionField, false) || !!this.view.state.field(revealSelectionField, false);
  }

  /** Coalesces all semantic consumers into one deferred slice, without timers on selection-only idle states. */
  private schedule(): void {
    if (this.destroyed || this.timer !== undefined || !this.requested || this.paused()) return;
    this.timer = setTimeout(() => this.advance(), 16);
  }

  /** Accepts parser progress through CM; no source transaction or feature-owned parser is created. */
  private advance(): void {
    this.timer = undefined;
    if (this.destroyed || this.requested !== this.view.state.doc || this.paused()) return;
    // The upstream parser cooperatively yields to this budget. One pathological
    // grammar step can exceed it; it is not a hard wall-clock interruption limit.
    if (forceParsing(this.view, this.view.state.doc.length, 4)) {
      this.requested = undefined; this.cancel();
    } else this.schedule();
  }

  /** Cancels the only outstanding callback. */
  private cancel(): void { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }
  /** Detaches state subscriptions and prevents a delayed dispatch into a destroyed view. */
  destroy(): void { this.destroyed = true; this.cancel(); this.stop?.(); this.stop = undefined; this.requested = undefined; }
}

/** Shared per-view scheduler; unused features incur no document parse or background timer. */
export const markdownParser = ViewPlugin.fromClass(DemandParser);
