import type { Node, Selection } from "@quirekit/pm";
import type { NativeTextContextSessionOptions, QuireTextContextLease, NativeTextReplacement, QuireTextContextProvider } from "./types";
import { NativeTextContextSynchronization } from "./synchronization";
import { acceptNativeTextSelection, selectNativeTextRange } from "./selection";
import { readNativeTextReplacement } from "./replacement";
import { readQuireMountedInputEditable } from "../binding/editability";
import { constrainNativeTextViewport } from "./presentation";

/** Coordinates context with the existing router; it never owns a second IME engine. */
export class NativeTextContextSession implements QuireTextContextLease {
  private readonly sync: NativeTextContextSynchronization;
  private readonly previousLabel: string | null;
  private readonly previousDescription: string | null;
  private inEvent = false;
  private compositionDoc: Node | null = null;
  private compositionSelection: Selection | null = null;
  private waiting: boolean;
  private cancelled = false;
  private cancelledInputPending = false;
  private pendingDispose = false;
  private destroyed = false;
  private restorePresentation: (() => void) | undefined;

  /** @param options - Input authority and bounded provider. */
  constructor(private readonly options: NativeTextContextSessionOptions) {
    const input = options.binding.inputProxy;
    this.waiting = options.waitForComposition;
    this.previousLabel = input.getAttribute("aria-label");
    this.previousDescription = input.getAttribute("aria-description");
    this.sync = new NativeTextContextSynchronization(input, options.provider);
    input.setAttribute("aria-label", options.provider.label);
    input.addEventListener("select", this.onSelection);
    input.addEventListener("selectionchange", this.onSelection);
    input.ownerDocument.addEventListener("selectionchange", this.onSelection);
    this.refresh();
  }

  /** @inheritdoc */
  get composing(): boolean { return this.waiting || this.compositionDoc !== null; }

  /** @inheritdoc */
  refresh(): void {
    if (this.destroyed || this.waiting || this.inEvent) return;
    this.restorePresentation ??= constrainNativeTextViewport(this.options.binding.inputProxy);
    if (this.compositionDoc) {
      if (this.compositionDoc === this.options.binding.editor.state.doc
        && this.compositionSelection?.eq(this.options.binding.editor.state.pm.selection)
        && readQuireMountedInputEditable(this.options.binding)) return;
      this.options.cancelInput();
    }
    this.sync.sync(this.options.binding.editor.state.pm);
  }

  /**
   * Routes one existing listener with context synchronization around its mutation phase.
   * @param event - Browser event received by the mounted binding.
   * @param route - Existing input/IME handler.
   * @param replace - Existing controller path for a native replacement.
   */
  route(event: Event, route: () => void, replace: (value: NativeTextReplacement) => void): void {
    if (this.destroyed || this.waiting) {
      route();
      if (event.type === "compositionend" || event.type === "blur") {
        this.waiting = false;
        this.finish();
      }
      return;
    }
    this.inEvent = true;
    try {
      const binding = this.options.binding;
      const context = this.sync.context;
      if (this.compositionSelection && !this.compositionSelection.eq(binding.editor.state.pm.selection)) this.options.cancelInput();
      if ((event.type === "keydown" && !(event as KeyboardEvent).isComposing) || event.type === "paste") this.cancelledInputPending = false;
      const editing = !["copy", "focus", "blur", "keyup"].includes(event.type);
      if (editing && (!readQuireMountedInputEditable(binding) || binding.shouldRouteInput?.() === false)) {
        event.preventDefault();
        this.options.cancelInput();
        return;
      }
      // External acceptance invalidates native offsets. Never apply an old browser edit to a new document.
      if (context && context.doc !== binding.editor.state.doc && event.type !== "focus" && event.type !== "blur") {
        event.preventDefault();
        this.options.cancelInput();
        return;
      }
      if (!this.composing && ["keydown", "beforeinput", "compositionstart", "copy", "cut", "paste"].includes(event.type)) {
        if (context && context.text === binding.inputProxy.value && !acceptNativeTextSelection(binding, context)) {
          event.preventDefault();
          return;
        }
      }
      if (event.type === "compositionstart") {
        this.cancelled = false;
        this.cancelledInputPending = false;
        this.compositionDoc = binding.editor.state.doc;
        this.compositionSelection = binding.editor.state.pm.selection;
      } else if (this.cancelled && (event.type.startsWith("composition") || (event as InputEvent).isComposing
        || ["insertFromComposition", "insertCompositionText", "deleteCompositionText"].includes((event as InputEvent).inputType))) {
        event.preventDefault();
        return;
      }
      if (event.type === "beforeinput" && !event.cancelable && !this.composing) return;
      if (event.type === "input" && !this.composing && !(event as InputEvent).isComposing) {
        // The browser may send a final insertText after a cancelled compositionend.
        // That orphaned value has no valid source epoch and must not replace accepted remote text.
        if (this.cancelledInputPending) { this.cancelledInputPending = false; return; }
        if (context) {
          const replacement = readNativeTextReplacement(context, binding.inputProxy.value);
          if (replacement && selectNativeTextRange(binding, replacement.from, replacement.to)) replace(replacement);
          return;
        }
      }
      route();
      if (event.type === "beforeinput" && event.defaultPrevented) this.cancelledInputPending = false;
    } finally {
      if (event.type === "compositionend" || event.type === "blur") {
        this.compositionDoc = null;
        this.compositionSelection = null;
      }
      this.inEvent = false;
      this.finish();
    }
  }

  /** @returns Input residue/preedit only; unchanged surrounding context is never user input. */
  readInputValue(): string {
    if (this.waiting || this.destroyed) return this.options.binding.inputProxy.value;
    const context = this.sync.context;
    return context ? readNativeTextReplacement(context, this.options.binding.inputProxy.value)?.text ?? ""
      : this.options.binding.inputProxy.value;
  }

  /** @returns Whether this session owns proxy restoration instead of unconditional clearing. */
  restore(): boolean {
    if (this.waiting || this.destroyed) return false;
    this.refresh();
    return true;
  }

  /** Invalidates native composition after blur, ownership loss or an external state change. */
  cancel(): void {
    this.cancelledInputPending ||= this.composing;
    this.cancelled ||= this.composing;
    this.compositionDoc = null;
    this.compositionSelection = null;
    this.waiting = false;
  }

  /** @param provider - Original policy owner. @returns Whether a pending release was cancelled. */
  retain(provider: QuireTextContextProvider): boolean {
    if (this.destroyed || !this.pendingDispose || provider !== this.options.provider) return false;
    this.pendingDispose = false;
    return true;
  }

  /** @inheritdoc */
  dispose(): void {
    this.pendingDispose = true;
    if (!this.composing && !this.inEvent) this.destroy();
  }

  /** Forces cleanup when the owning view is destroyed; no preedit is committed. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const input = this.options.binding.inputProxy;
    input.removeEventListener("select", this.onSelection);
    input.removeEventListener("selectionchange", this.onSelection);
    input.ownerDocument.removeEventListener("selectionchange", this.onSelection);
    if (this.previousLabel === null) input.removeAttribute("aria-label");
    else input.setAttribute("aria-label", this.previousLabel);
    if (this.previousDescription === null) input.removeAttribute("aria-description");
    else input.setAttribute("aria-description", this.previousDescription);
    this.restorePresentation?.();
    input.value = "";
    input.setSelectionRange(0, 0);
    this.options.onDispose();
  }

  /** Restores accepted text once after the complete native event has finished. */
  private finish(): void {
    if (this.pendingDispose && !this.composing) this.destroy();
    else this.refresh();
  }

  /** Accepts screen-reader selection changes that do not produce keyboard events. */
  private readonly onSelection = (): void => {
    const input = this.options.binding.inputProxy;
    const root = input.getRootNode?.() as Document | ShadowRoot | undefined;
    if (this.destroyed || this.inEvent || this.composing
      || (root?.activeElement ?? input.ownerDocument.activeElement) !== input) return;
    if (this.sync.context?.text !== input.value) return;
    this.inEvent = true;
    try { acceptNativeTextSelection(this.options.binding, this.sync.context); }
    finally { this.inEvent = false; this.finish(); }
  };
}
