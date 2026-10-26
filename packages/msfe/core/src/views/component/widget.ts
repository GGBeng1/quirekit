import { WidgetType, type EditorView, type Rect } from "@quirekit/cm-view";
import type { MsfeEditor } from "../../editor/types";
import type { MsfeComponentHost } from "../types";
import type { ComponentView, ComponentViewHandle } from "./types";
import type { TaskScope } from "../../tasks/scope";

const mounts = new WeakMap<HTMLElement, { key: string; view: ComponentView; handle: ComponentViewHandle<object>; scope: TaskScope; editorView: EditorView }>();

/** Off-screen block components retained per editor view; oldest are released beyond this bound. */
export const PARKED_BLOCK_LIMIT = 16;
/**
 * Block widgets leaving the viewport keep their rendered DOM so scrolling back reattaches it instead of
 * re-rendering diagrams and boards. A retained mount is reused only by an `eq` widget (same layer key, renderer and
 * props identity), so inputs are unchanged. Scopes still end with the document scope.
 */
const parked = new WeakMap<EditorView, Map<ComponentWidget, HTMLElement>>();

/** @param dom - Mounted boundary. Ends its renderer lifetime and forgets it. */
function release(dom: HTMLElement): void { mounts.get(dom)?.scope.dispose(); mounts.delete(dom); }

/** Non-editable component control; surrounding source remains the sole contentEditable owner. */
export class ComponentWidget extends WidgetType {
  /** @param key - Stable identity within this layer. @param component - Typed view boundary. @param block - Vertical layout ownership.
   * @param editor - Canonical editor resolved after construction. @param host - Consumer framework store.
   * @param replacement - Whether this widget replaces a nonempty source interval, rather than sitting at one position. */
  constructor(private readonly key: string, private readonly component: ComponentView, private readonly block: boolean,
    private readonly editor: () => MsfeEditor, private readonly host: MsfeComponentHost | undefined, private readonly replacement = false) { super(); }
  /** @param other - Previous widget description. @returns Whether renderer inputs are unchanged. */
  eq(other: ComponentWidget): boolean {
    return this.key === other.key && this.block === other.block && this.replacement === other.replacement
      && this.component.renderer === other.component.renderer && this.component.props === other.component.props;
  }
  /** @param view - CM input owner. @returns Non-editable component boundary. */
  toDOM(view: EditorView): HTMLElement {
    const retained = parked.get(view);
    for (const [widget, element] of retained ?? []) {
      if (!widget.eq(this)) continue;
      retained!.delete(widget);
      if (!mounts.get(element)?.scope.disposed) return element;
      release(element);
    }
    const dom = view.dom.ownerDocument.createElement(this.block ? "div" : "span");
    dom.className = "msfe-component-view"; dom.contentEditable = "false"; dom.dataset.msfeComponent = this.key;
    const scope = this.editor().documentScope.fork();
    try {
      const handle = this.component.renderer({ dom, props: this.component.props, host: this.host, scope, requestMeasure: () => view.requestMeasure() });
      scope.own(() => handle.destroy());
      const Observer = dom.ownerDocument.defaultView?.ResizeObserver;
      if (Observer) { const observer = new Observer(() => view.requestMeasure()); observer.observe(dom); scope.own(() => observer.disconnect()); }
      mounts.set(dom, { key: this.key, view: this.component, handle, scope, editorView: view });
    } catch (error) { scope.dispose(); throw error; }
    return dom;
  }
  /** @param dom - Retained mount. @returns Whether the current renderer can consume the next inputs. */
  updateDOM(dom: HTMLElement): boolean {
    const mount = mounts.get(dom);
    if (!mount || mount.key !== this.key || mount.view.renderer !== this.component.renderer) return false;
    mount.handle.update(this.component.props); mount.view = this.component; return true;
  }
  /** @param dom - Mounted component boundary. @param pos - Source offset within the replacement.
   * @param side - Association for a zero-width insertion. @returns One native-sized caret at a block edge; inline geometry stays native. */
  coordsAt(dom: HTMLElement, pos: number, side: number): Rect | null {
    const view = mounts.get(dom)?.editorView;
    if (!this.block || !view) return null;
    // The object box remains complete for selection. Only endpoint geometry is
    // a text line, expressed in the same scaled client space as the native box.
    const box = dom.getBoundingClientRect(), height = Math.min(box.height, view.defaultLineHeight * view.scaleY);
    if (height <= 0) return null;
    const start = this.replacement ? pos === 0 : side <= 0;
    const x = start ? box.left : box.right, top = start ? box.top : box.bottom - height;
    return { left: x, right: x, top, bottom: top + height };
  }
  /** @param event - Widget descendant event. @returns Mounted event ownership; static source previews may delegate native selection to CM. */
  ignoreEvent(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    const dom = target?.closest?.<HTMLElement>(".msfe-component-view");
    return dom ? mounts.get(dom)?.handle.ignoreEvent?.(event) ?? true : true;
  }
  /** @param dom - Removed widget boundary. */
  destroy(dom: HTMLElement): void {
    const mount = mounts.get(dom);
    if (!this.block || !mount || mount.scope.disposed) { release(dom); return; }
    const retained = parked.get(mount.editorView) ?? new Map<ComponentWidget, HTMLElement>();
    parked.set(mount.editorView, retained);
    retained.set(this, dom);
    for (const [widget, element] of retained) {
      if (retained.size <= PARKED_BLOCK_LIMIT) break;
      retained.delete(widget); release(element);
    }
  }
}
