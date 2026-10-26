import { EditorView, ViewPlugin, type ViewUpdate } from "@quirekit/cm-view";
import { readSourcePresentation, sourceInputHasFocus, sourceInputElement, sourceInputFocusChanged, focusSourceView } from "@quirekit/msfe-core";
import { createQuireSelectionGesture, createQuireSelectionHandles, resolveQuireKitLocale } from "@quirekit/ui";
import { measureMobileSelection } from "./geometry";
import { MobileSelectionInteraction } from "./interaction";
import { MobileSelectionScroll } from "./scroll";

/** Instance-local adapter from native input/selection ownership to public mobile primitives. */
class MobileSelectionView {
  private readonly win;
  private readonly query;
  private readonly interaction;
  private readonly scroll;
  private readonly handles;
  private readonly gesture;
  private locale = "zh-CN";
  private messages = resolveQuireKitLocale(this.locale).messages.selectionHandles;
  private destroyed = false;
  private projected = false;
  private seenFocus = false;

  /** @param view - Mounted CodeMirror owner; no second editor state is introduced. */
  constructor(private readonly view: EditorView) {
    const doc = view.dom.ownerDocument;
    this.win = doc.defaultView!;
    this.query = this.win.matchMedia("(max-width: 767px) and (any-pointer: coarse)");
    this.interaction = new MobileSelectionInteraction(view, () => this.enabled());
    this.scroll = new MobileSelectionScroll(view, () => this.enabled(), point => this.interaction.move(point));
    this.handles = createQuireSelectionHandles({ ownerDocument: doc, selection: null, disabled: true,
      onDragStart: detail => { focusSourceView(view); this.interaction.begin(detail); },
      onDrag: detail => this.scroll.move(detail.point),
      onLongPressStart: () => this.interaction.holdCaret(),
      onDragEnd: () => { this.scroll.cancel(); this.interaction.cancel(); },
      onNudge: intent => this.interaction.nudge(intent) });
    view.dom.append(this.handles.element);
    this.gesture = createQuireSelectionGesture({ target: view.contentDOM, disabled: true,
      ignore: event => !!(event.target as Element).closest(".msfe-node-view, .msfe-component-view, [data-qk-not-prose]"),
      onLongPressStart: detail => { focusSourceView(view); this.interaction.hold(detail.origin); },
      onSelectionChange: detail => this.scroll.move(detail.point),
      onSelectionComplete: () => { this.scroll.cancel(); this.interaction.cancel(); }, onCancel: () => { this.scroll.cancel(); this.interaction.cancel(); } });

    // Input ownership changes cancel immediately. Geometry changes enter CM's
    // measure queue so endpoint reads precede all UI writes and use current scale.
    this.query.addEventListener("change", this.refresh);
    view.dom.addEventListener("focusin", this.refresh);
    view.dom.addEventListener("focusout", this.refresh);
    doc.addEventListener("scroll", this.refresh, true);
    this.win.addEventListener("resize", this.refresh);
    this.win.addEventListener("focus", this.refresh);
    this.win.addEventListener("blur", this.suspend);
    this.win.visualViewport?.addEventListener("resize", this.refresh);
    this.win.visualViewport?.addEventListener("scroll", this.refresh);
    view.contentDOM.addEventListener("compositionstart", this.suspend, true);
    view.contentDOM.addEventListener("compositionend", this.refresh);
    this.refresh();
  }

  /** @returns Whether this editor can change a logical endpoint; IME retains its captured target. */
  private enabled(): boolean {
    return this.visible() && !readSourcePresentation(this.view.state).composing && !this.view.compositionStarted
      && sourceInputHasFocus(this.view);
  }

  /** @returns One visible custom caret, including passive IME and retained settings focus. */
  private visible(): boolean {
    const doc = this.view.dom.ownerDocument, active = doc.activeElement;
    const isolated = sourceInputElement(this.view) !== this.view.contentDOM;
    return !this.destroyed && this.query.matches && !this.view.state.readOnly
      && readSourcePresentation(this.view.state).mode === "live"
      && (isolated || !this.view.compositionStarted && !readSourcePresentation(this.view.state).composing)
      && (isolated && this.seenFocus || doc.hasFocus() && (sourceInputHasFocus(this.view) || this.view.dom.hasAttribute("data-md-retained-selection")
        || !!active && this.handles.element.contains(active)));
  }

  /** @returns Whether the native content attribute owner should retain the public touch-surface class. */
  get touchSurface(): boolean {
    return this.query.matches && !this.view.state.readOnly
      && readSourcePresentation(this.view.state).mode === "live" && !this.view.compositionStarted && !readSourcePresentation(this.view.state).composing;
  }

  /** Cancel gesture targets when source, mode or input ownership changes. @param update - Accepted native dependencies. */
  update(update: ViewUpdate): void {
    if (update.docChanged || !this.enabled()
      || readSourcePresentation(update.startState).mode !== readSourcePresentation(update.state).mode) this.cancel();
    if (update.docChanged || update.selectionSet || update.geometryChanged || update.viewportChanged || sourceInputFocusChanged(update)
      || update.startState.readOnly !== update.state.readOnly
      || readSourcePresentation(update.startState) !== readSourcePresentation(update.state)) this.refresh();
  }

  /** Release transient input without reverting any accepted native state. */
  private cancel(): void { this.scroll.cancel(); this.interaction.cancel(); this.handles.cancel(); this.gesture.cancel(); }

  /** Hide duplicate caret ownership immediately when composition/window focus takes over. */
  private readonly suspend = (): void => {
    if (!this.destroyed && this.query.matches && !this.view.state.readOnly && readSourcePresentation(this.view.state).mode === "live"
      && sourceInputElement(this.view) !== this.view.contentDOM) { this.cancel(); this.refresh(); return; }
    this.cancel(); this.handles.update({ selection: null, disabled: true });
    this.gesture.update({ disabled: true }); this.view.dom.removeAttribute("data-md-mobile-selection");
    this.view.contentDOM.classList.remove("qk-selection-gesture");
  };

  /** Schedule at most one bounded read/write projection in the native measure queue. */
  private readonly refresh = (): void => {
    if (this.destroyed) return;
    if (sourceInputHasFocus(this.view)) this.seenFocus = true;
    if (!this.query.matches) {
      if (this.projected) { this.projected = false; this.suspend(); }
      return;
    }
    this.projected = true;
    this.view.requestMeasure({ key: this,
      read: () => this.visible() ? measureMobileSelection(this.view) : null,
      write: selection => {
        if (this.destroyed) return;
        const enabled = this.enabled();
        if (!enabled) this.cancel();
        const locale = this.view.dom.closest("[lang]")?.getAttribute("lang") ?? "zh-CN";
        if (locale !== this.locale) { this.locale = locale; this.messages = resolveQuireKitLocale(locale).messages.selectionHandles; }
        this.handles.update({ selection: this.visible() ? selection : null, disabled: !enabled,
          messages: this.messages });
        // Surface recognition also works before focus; ordinary taps/scrolls are
        // untouched, and the accepted hold takes native focus before selecting.
        this.gesture.update({ disabled: !this.touchSurface });
        this.view.contentDOM.classList.toggle("qk-selection-gesture", this.touchSurface);
        this.view.dom.toggleAttribute("data-md-mobile-selection", this.visible() && !!selection);
      } });
  };

  /** Remove every media, viewport, document and primitive listener with the native view. */
  destroy(): void {
    this.destroyed = true;
    const doc = this.view.dom.ownerDocument;
    this.query.removeEventListener("change", this.refresh);
    this.view.dom.removeEventListener("focusin", this.refresh); this.view.dom.removeEventListener("focusout", this.refresh);
    doc.removeEventListener("scroll", this.refresh, true);
    this.win.removeEventListener("resize", this.refresh); this.win.removeEventListener("blur", this.suspend);
    this.win.removeEventListener("focus", this.refresh);
    this.win.visualViewport?.removeEventListener("resize", this.refresh);
    this.win.visualViewport?.removeEventListener("scroll", this.refresh);
    this.view.contentDOM.removeEventListener("compositionstart", this.suspend, true);
    this.view.contentDOM.removeEventListener("compositionend", this.refresh);
    this.scroll.cancel(); this.gesture.destroy(); this.handles.destroy(); this.interaction.cancel();
    this.view.dom.removeAttribute("data-md-mobile-selection");
  }
}

/** Public mobile handles use CodeMirror geometry while its native input/composition pipeline stays intact. */
export const proseMobileSelection = ViewPlugin.fromClass(MobileSelectionView);

/**
 * Let CodeMirror retain the public gesture class through its content attribute updates.
 * @param view - Native attribute and media-subscription owner.
 * @returns The touch-only recipe class, otherwise an empty class contribution.
 */
export function mobileSelectionContentClass(view: EditorView): string {
  return view.plugin(proseMobileSelection)?.touchSurface ? "qk-selection-gesture" : "";
}
