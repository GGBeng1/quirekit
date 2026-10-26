import type {
  QuireCanvasDocumentRange, QuireCanvasPoint, QuireHiddenTextViewMode,
  QuireMountedObjectAnchorResolution, QuireScrollIntoViewOptions, QuireViewWidget, QuireViewWidgetHit
} from "@quirekit/core";
import type { EditorView } from "@quirekit/pm-view";
import type { EditorState, Slice } from "@quirekit/pm";
import { scrollContainer, scrollDelta } from "./scroll";

/** Native DOM operations and explicit absence of retained-renderer capabilities. */
export abstract class DomViewSurface {
  /** Actual PM view supplied to native plugin and node/mark view callbacks. */
  abstract readonly nativeView: EditorView;

  /** @returns Browser-owned editable root. */
  get dom() { return this.nativeView.dom; }
  /** @returns Current native view state. */
  get state() { return this.nativeView.state; }
  /** @returns Effective native input editability. */
  get editable() { return this.nativeView.editable; }
  /** @returns Whether the native input pipeline owns an active composition. */
  get composing() { return this.nativeView.composing; }
  /** @returns Document or shadow root containing this surface. */
  get root() { return this.nativeView.root; }
  /** @returns Whether native listeners and observers have been released. */
  get isDestroyed() { return this.nativeView.isDestroyed; }
  /** @returns Whether this surface owns keyboard focus. */
  hasFocus() { return !this.isDestroyed && this.nativeView.hasFocus(); }
  /** Focuses the native editable element. */
  focus(): void { if (!this.isDestroyed && this.editable) this.nativeView.focus(); }
  /** Refreshes the cached root after a host moves between shadow trees. */
  updateRoot(): void { this.nativeView.updateRoot(); }

  /**
   * @param coords - Client CSS coordinates.
   * @returns Native document hit.
   */
  posAtCoords(coords: Parameters<EditorView["posAtCoords"]>[0]) {
    return this.nativeView.posAtCoords(coords);
  }
  /**
   * @param pos - Document position.
   * @param side - Boundary preference.
   * @returns Client rectangle.
   */
  coordsAtPos(pos: number, side?: number) { return this.nativeView.coordsAtPos(pos, side); }
  /**
   * @param pos - Document position.
   * @param side - Boundary preference.
   * @returns Native DOM position.
   */
  domAtPos(pos: number, side?: number) { return this.nativeView.domAtPos(pos, side); }
  /**
   * @param node - DOM node.
   * @param offset - DOM offset.
   * @param bias - Boundary preference.
   * @returns Document position.
   */
  posAtDOM(node: Node, offset: number, bias?: number) { return this.nativeView.posAtDOM(node, offset, bias); }
  /**
   * @param pos - Position before a node.
   * @returns Native node DOM or null.
   */
  nodeDOM(pos: number) { return this.nativeView.nodeDOM(pos); }
  /**
   * @param direction - Movement direction.
   * @param state - Optional command probe state.
   * @returns Whether movement leaves the current textblock.
   */
  endOfTextblock(direction: Parameters<EditorView["endOfTextblock"]>[0], state?: EditorState) {
    return this.nativeView.endOfTextblock(direction, state);
  }
  /**
   * @param event - DOM event to route.
   * @returns Whether a handler prevented the default action.
   */
  dispatchEvent(event: Event): boolean {
    if (this.isDestroyed) return false;
    this.nativeView.dispatchEvent(event);
    return event.defaultPrevented;
  }
  /**
   * @param html - Clipboard HTML.
   * @param event - Originating event.
   * @returns Whether paste was handled.
   */
  pasteHTML(html: string, event?: ClipboardEvent): boolean {
    return !this.isDestroyed && this.editable && this.nativeView.pasteHTML(html, event);
  }
  /**
   * @param text - Clipboard text.
   * @param event - Originating event.
   * @returns Whether paste was handled.
   */
  pasteText(text: string, event?: ClipboardEvent): boolean {
    return !this.isDestroyed && this.editable && this.nativeView.pasteText(text, event);
  }
  /**
   * @param slice - Copied content.
   * @returns Native transformed HTML, text and slice.
   */
  serializeForClipboard(slice: Slice) { return this.nativeView.serializeForClipboard(slice); }
  /** @returns Whether the focused native selection was available for scrolling. */
  scrollToSelection(): boolean {
    if (!this.hasFocus()) return false;
    this.nativeView.scrollToSelection();
    return true;
  }
  /**
   * Scrolls a document range into view without changing the selection.
   * @param range - Document range to reveal.
   * @param options - Alignment and margin.
   * @returns Whether native coordinates for the range were available.
   */
  scrollRangeIntoView(range: { readonly from: number; readonly to: number }, options?: QuireScrollIntoViewOptions): boolean {
    if (this.isDestroyed) return false;
    const size = this.state.doc.content.size;
    const from = Math.max(0, Math.min(range.from, range.to, size));
    const to = Math.min(size, Math.max(range.from, range.to, 0));
    const start = this.nativeView.coordsAtPos(from, 1);
    const end = this.nativeView.coordsAtPos(to, -1);
    const target = { top: Math.min(start.top, end.top), bottom: Math.max(start.bottom, end.bottom) };
    const container = scrollContainer(this.nativeView.dom);
    const window = this.nativeView.dom.ownerDocument.defaultView;
    const viewport = container ? container.getBoundingClientRect() : { top: 0, bottom: window?.innerHeight ?? 0 };
    const delta = scrollDelta(target, viewport, options);
    if (delta !== 0) {
      if (container) container.scrollTop += delta;
      else window?.scrollBy(0, delta);
    }
    return true;
  }

  /** Native DOM does not own Word hidden-text inspection. */
  readonly hiddenTextViewMode = "normal" as const;
  /** @param mode - Requested presentation mode; only normal is supported. */
  setHiddenTextViewMode(mode: QuireHiddenTextViewMode): void {
    if (mode !== "normal") throw new RangeError("Native DOM view does not provide Word formatting inspection.");
  }
  /** @returns No retained interaction target in a native DOM surface. */
  getInteractionTargetSnapshot(): null { return null; }
  /** @returns No renderer widget products in a native DOM surface. */
  getWidgets(): readonly QuireViewWidget[] { return []; }
  /**
   * @param _id - Widget identity.
   * @returns No retained widget.
   */
  getWidgetById(_id: string): undefined { return undefined; }
  /**
   * @param _role - Semantic role.
   * @returns No retained widgets.
   */
  getWidgetsByRole(_role: string): readonly QuireViewWidget[] { return []; }
  /**
   * @param _part - Semantic part.
   * @returns No retained widgets.
   */
  getWidgetsByPart(_part: string): readonly QuireViewWidget[] { return []; }
  /**
   * @param _position - Document position.
   * @returns No retained widgets.
   */
  getWidgetsByPosition(_position: number): readonly QuireViewWidget[] { return []; }
  /**
   * @param _range - Document range.
   * @returns No retained widgets.
   */
  getWidgetsByRange(_range: QuireCanvasDocumentRange): readonly QuireViewWidget[] { return []; }
  /**
   * @param _point - Renderer position.
   * @returns No retained widget hit.
   */
  widgetAtPoint(_point: QuireCanvasPoint): QuireViewWidgetHit | null { return null; }
  /**
   * @param _objectId - Retained object identity.
   * @returns Explicitly unsupported retained geometry.
   */
  getObjectAnchor(_objectId: string): QuireMountedObjectAnchorResolution {
    return { status: "unsupported", kind: "object", reason: "snapshot-version-unavailable" };
  }
}
