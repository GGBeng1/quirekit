import type { QuireMountedServiceContext } from "@quirekit/view/mounted-services";
import type { QuireAccessibilityOptions } from "../types";
import type { AccessibilityWork } from "../runtime/types";
import type { ReadingSegment } from "./types";
import { projectReadingSegment } from "./projection";
import { renderReadingItems } from "./dom";
import { supportsTextPosition } from "../registry/semantics";
import type { AccessibilityRegistry } from "../registry/types";

/** Visible on-demand alternative with explicit boundaries and stable navigation controls. */
export class ReadingSurface {
  private readonly host: HTMLElement;
  private readonly entry: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly content: HTMLElement;
  private readonly status: HTMLElement;
  private readonly previous: HTMLButtonElement;
  private readonly next: HTMLButtonElement;
  private segment: ReadingSegment | undefined;
  private cursors = [0];
  private releaseVisual: (() => void) | undefined;
  private signature: string | undefined;
  private editable: boolean | undefined;

  /** @param context - Mounted capabilities. @param options - Presentation and bounds. @param work - Observable work counts. @param registry - Editor-local semantic owners. */
  constructor(private readonly context: QuireMountedServiceContext,
    private readonly options: QuireAccessibilityOptions, private readonly work: AccessibilityWork,
    private readonly registry: AccessibilityRegistry) {
    const doc = context.view.dom.ownerDocument;
    this.host = doc.createElement("div");
    this.host.dataset.qkAccessibility = "";
    // SVG routes pointer gestures at its root. Reading controls and native text selection
    // are a separate DOM interaction surface, so they must not start a document drag.
    for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "contextmenu"]) {
      this.host.addEventListener(type, (event) => { event.stopPropagation(); });
    }
    this.entry = this.button(options.labels.reading, () => { this.open(); });
    this.panel = doc.createElement("section");
    this.panel.setAttribute("aria-label", options.labels.reading);
    this.panel.tabIndex = -1;
    this.panel.hidden = true;
    Object.assign(this.host.style, { position: "sticky", top: "0", zIndex: "10", height: "0", width: "100%" });
    Object.assign(this.entry.style, { position: "absolute", right: "0", top: "0" });
    Object.assign(this.panel.style, { padding: "16px", background: "Canvas", color: "CanvasText",
      position: "absolute", right: "0", top: "40px", width: "min(36rem, 100%)", boxSizing: "border-box",
      userSelect: "text",
      border: "1px solid currentColor", maxHeight: "60vh", overflow: "auto", whiteSpace: "pre-wrap" });
    this.status = doc.createElement("p");
    this.status.setAttribute("role", "status");
    this.status.setAttribute("aria-live", "polite");
    this.content = doc.createElement("div");
    this.previous = this.button(options.labels.previous, () => {
      if (this.cursors.length > 1) { this.cursors.pop(); this.render(); this.panel.focus(); }
    });
    this.next = this.button(options.labels.next, () => {
      if (this.segment?.next != null) { this.cursors.push(this.segment.next); this.render(); this.panel.focus(); }
    });
    this.panel.append(this.status, this.previous, this.next,
      this.button(options.labels.returnToEditor, () => {
        if (!context.view.editable) this.close();
        else if (!this.closeToEditor()) this.status.textContent = options.labels.unavailable;
      }), this.content);
    this.host.append(this.entry, this.panel);
    context.view.dom.prepend(this.host);
  }

  /** @returns Whether the explicit reading surface acquired focus. */
  open(): boolean {
    this.panel.hidden = false;
    if (!this.segment || this.segment.doc !== this.context.editor.state.doc) this.render();
    this.panel.focus({ preventScroll: true });
    this.releaseVisual ??= this.context.suspendVisualAccessibility() ?? undefined;
    return this.activeElement() === this.panel;
  }

  /** @returns Whether existing canonical text selection was accepted for editing. */
  closeToEditor(): boolean {
    const { doc, selection } = this.context.editor.state.pm;
    if (!selection.$anchor.sameParent(selection.$head) || !supportsTextPosition(selection.$anchor, this.registry)
      || !this.context.activateText({ doc, anchor: selection.anchor, head: selection.head })) return false;
    this.close();
    return true;
  }

  /** Updates document dependencies only while reading is open. */
  update(): void {
    if (!this.panel.hidden && this.segment?.doc !== this.context.editor.state.doc) {
      // Previous offsets cannot represent navigation history after a structural edit.
      this.cursors = [0];
      this.render();
    }
    this.syncEditable();
  }

  /** Writes button permission state only when permission or item DOM has changed. */
  private syncEditable(): void {
    if (this.editable === this.context.view.editable) return;
    this.editable = this.context.view.editable;
    this.content.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      button.disabled = !this.editable;
    });
  }

  /** Restores visual semantics before hiding the alternate surface. */
  close(): void {
    if (this.panel.contains(this.activeElement())) this.entry.focus({ preventScroll: true });
    this.releaseVisual?.();
    this.releaseVisual = undefined;
    this.panel.hidden = true;
  }

  /** @param restoreFocus - False during owning view teardown, when native listeners must not reenter the editor. */
  destroy(restoreFocus = true): void {
    if (restoreFocus && this.host.contains(this.activeElement())) {
      const input = this.context.view.elements.inputProxy;
      if (input) input.focus({ preventScroll: true });
      else this.context.view.dom.focus({ preventScroll: true });
    }
    this.releaseVisual?.();
    this.host.remove();
  }

  /** @returns Active node in the current document or shadow root. */
  private activeElement(): Element | null {
    return (this.host.getRootNode() as Document | ShadowRoot).activeElement ?? null;
  }

  /** Reconciles one bounded segment; unchanged item DOM and focus remain intact. */
  private render(): void {
    const segment = projectReadingSegment(this.context.editor.state.doc, this.cursors.at(-1) ?? 0, this.options, this.registry);
    this.work.readingCompiles++;
    this.segment = segment;
    this.status.textContent = this.options.labels.segment(this.cursors.length, segment.next === null);
    this.previous.disabled = this.cursors.length === 1;
    this.next.disabled = segment.next === null;
    const signature = JSON.stringify(segment.items.map(({ from, to, ...facts }) => facts));
    if (this.signature !== signature) {
      if (this.content.contains(this.activeElement())) this.panel.focus({ preventScroll: true });
      renderReadingItems(this.content, segment.items, this.options.labels, (index) => {
        // Event handlers resolve the current version, including unchanged DOM after source shifts.
        const current = this.segment;
        const target = current?.items[index];
        if (current && target?.editable && current.doc === this.context.editor.state.doc
          && supportsTextPosition(current.doc.resolve(target.from), this.registry)
          && this.context.activateText({ doc: current.doc, anchor: target.from, head: target.from })) this.close();
        else this.status.textContent = this.options.labels.unavailable;
      });
      this.work.readingDomUpdates += Math.max(1, segment.items.length);
      this.signature = signature;
    }
    this.editable = undefined;
    this.syncEditable();
  }

  /** @param label - Visible and accessible label. @param action - Explicit user action. @returns Native keyboard-operable button. */
  private button(label: string, action: () => void): HTMLButtonElement {
    const button = this.context.view.dom.ownerDocument.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }
}
