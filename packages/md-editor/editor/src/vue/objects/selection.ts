import { shallowRef, watch, type ShallowRef } from "vue";
import { EditorView } from "@quirekit/cm-view";
import { EditorSelection } from "@quirekit/cm-state";
import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import { projectMdLayerRect } from "../overlays/context";
import { mdObjectFrame, mdObjectSelector, resolveMdObject } from "./resolve";
import type { MdObjectRect, MdObjectSelection } from "./types";

/** Host inputs for the object selection controller. */
export interface MdObjectSelectionOptions {
  /** Mounted editor, absent before creation. */ readonly editor: () => MsfeEditor | undefined;
  /** Overlay host whose action bar and preview keep the selection alive. */ readonly overlay: () => HTMLElement | undefined;
  /** Whether no other product task currently owns the surface. */ readonly enabled: () => boolean;
  /** Editor-sized document layer that owns the ring and action bar. */ readonly layer: () => HTMLElement | undefined;
  /** @param event - Keyboard request routed from the selected object. */ readonly keydown: (event: KeyboardEvent) => void;
  /** Double-click on a selected image. */ readonly activate: () => void;
  /** @param root - Clicked read-only image, which previews directly instead of selecting. @param range - Its source. */
  readonly preview: (root: HTMLElement, range: MsfeSourceRange) => void;
}

/** Reactive selection state shared by the ring, action bar and preview. */
export interface MdObjectSelectionState {
  /** Current object, or null. */ readonly selected: ShallowRef<MdObjectSelection | null>;
  /** Object frame local to the document layer; null while its widget is unmounted. */ readonly rect: ShallowRef<MdObjectRect | null>;
  /** Advances on accepted source changes so derived facts are re-read. */ readonly revision: ShallowRef<number>;
  /** @param focusEditor - Return the caret to the document after releasing. */ clear(focusEditor?: boolean): void;
  /** @param side - Source side to resume editing. @returns Whether the selected object handed focus to a canonical caret. */ moveCaret(side: -1 | 1): boolean;
}

/**
 * Retains object focus separately, handing source selection back only on explicit navigation.
 * @param options - Editor, overlay and enablement accessors.
 * @returns Reactive state and an explicit release.
 */
export function useMdObjectSelection(options: MdObjectSelectionOptions): MdObjectSelectionState {
  const selected = shallowRef<MdObjectSelection | null>(null), rect = shallowRef<MdObjectRect | null>(null);
  const revision = shallowRef(0);
  let schedule = (): void => undefined;

  /** @param focusEditor - Return focus to the document. */
  function clear(focusEditor = false): void {
    const current = selected.value;
    if (!current) return;
    selected.value = null; rect.value = null;
    current.anchor.release();
    if (focusEditor) options.editor()?.focus();
  }

  /** @param side - Source side requested by the arrow key. @returns Whether focus returned to the source editor. */
  function moveCaret(side: -1 | 1): boolean {
    const current = selected.value, range = current?.anchor.getRange(), editor = options.editor();
    const view = editor && EditorView.findFromDOM(editor.element);
    if (!current || !range || !view || view.composing) return false;
    let cursor = EditorSelection.cursor(side < 0 ? range.from : range.to, side);
    // Inline images retain insertion slots on both sides. Block previews must
    // cross their hidden shell using the same native navigation as the text.
    if (current.kind !== "image") cursor = view.moveByChar(cursor, side > 0);
    clear();
    editor!.setSelection(EditorSelection.create([cursor]));
    editor!.focus(); editor!.scrollTo(cursor.head);
    return true;
  }

  watch([options.editor, options.enabled], ([editor, enabled], _previous, cleanup) => {
    if (!enabled) clear();
    if (!editor || !enabled) return;
    const element = editor.element, doc = element.ownerDocument, win = doc.defaultView!;
    let frame = 0;
    let observed: HTMLElement | null = null;
    const resize = win.ResizeObserver ? new win.ResizeObserver(() => schedule()) : null;
    const content = EditorView.findFromDOM(element)?.contentDOM;
    if (content) resize?.observe(content);

    /** @param target - Event target. @returns Whether it belongs to the selected object or its overlays. */
    function owned(target: EventTarget | null): boolean {
      const node = target as Node | null, overlay = options.overlay();
      const bar = node instanceof win.Element ? node.closest("[data-md-object-actions]") : node?.parentElement?.closest("[data-md-object-actions]");
      return !!node && (!!selected.value?.element.contains(node) || !!overlay?.contains(node) || !!bar);
    }
    /** @param view - Mounted view. @returns The current component root, found again after a widget remount. */
    function mounted(view: EditorView): HTMLElement | null {
      const current = selected.value, range = current?.anchor.getRange();
      if (!current || !range) return null;
      if (current.element.isConnected) return current.element;
      for (const candidate of view.contentDOM.querySelectorAll<HTMLElement>(mdObjectSelector)) {
        if (resolveMdObject(view, editor!, candidate)?.range.from === range.from) return current.element = candidate;
      }
      return null;
    }
    // Layer-local geometry is invariant under scrolling, so only selection, source edits and
    // size changes re-measure; the browser moves the ring and bar with the document.
    function measure(): void {
      frame = 0;
      const view = EditorView.findFromDOM(element), mountedRoot = view && mounted(view), root = mountedRoot ? mdObjectFrame(mountedRoot) : null;
      if (root !== observed) { if (observed) resize?.unobserve(observed); observed = root ?? null; if (root) resize?.observe(root); }
      const box = root?.getBoundingClientRect();
      rect.value = box && box.width > 0 ? projectMdLayerRect(options.layer(), box) : null;
    }
    schedule = () => { if (!frame) frame = win.requestAnimationFrame(measure); };

    /** @param event - Primary press inside the editor: select an object or release the current one. */
    function press(event: PointerEvent): void {
      if (event.button !== 0) return;
      const root = (event.target as Element | null)?.closest<HTMLElement>(mdObjectSelector);
      // Embedded data controls own pointer focus, selection, drag and native input.
      // Only an explicit press on their outer frame selects the whole source object.
      if (root?.dataset.qkDataView === "inline" && event.target !== root) { clear(); return; }
      const view = EditorView.findFromDOM(element);
      const hit = root && view ? resolveMdObject(view, editor!, root) : null;
      if (!hit) { clear(); return; }
      // Read-only images have no actions to offer; a click opens the shared gallery directly.
      if (hit.kind === "image" && (editor!.state.readOnly || editor!.mode === "locked")) { clear(); options.preview(root!, hit.range); return; }
      if (selected.value?.element === root) return;
      clear();
      selected.value = { kind: hit.kind, anchor: editor!.captureAnchor(hit.range), element: root! };
      if (!root!.hasAttribute("tabindex")) root!.tabIndex = -1;
      // The following mousedown is held below, so native focus does not move and keys reach the object at once.
      root!.focus({ preventScroll: true });
      schedule();
    }
    /** @param event - Mouse press inside a selected object; block previews let CM handle their output, which would move focus to the text. */
    function hold(event: MouseEvent): void {
      if (selected.value?.element.dataset.qkDataView === "inline" && event.target !== selected.value.element) return;
      if (event.button === 0 && selected.value?.element.contains(event.target as Node)) { event.preventDefault(); event.stopPropagation(); }
    }
    /** @param event - Press outside the editor; overlays keep the selection. */
    function outside(event: PointerEvent): void { if (!element.contains(event.target as Node) && !owned(event.target)) clear(); }
    /** @param event - Focus moving elsewhere, such as Tab into the text. */
    function focus(event: FocusEvent): void { if (selected.value && !owned(event.target)) clear(); }
    /** @param event - Keys pressed while the object holds focus. */
    function key(event: KeyboardEvent): void {
      if (selected.value?.element.dataset.qkDataView === "inline" && event.target !== selected.value.element) return;
      if (selected.value?.element.contains(event.target as Node)) options.keydown(event);
    }
    /** @param event - Double-click; diagrams keep their own editing activation. */
    function double(event: MouseEvent): void {
      if (selected.value?.kind === "image" && selected.value.element.contains(event.target as Node)) { event.preventDefault(); options.activate(); }
    }

    element.addEventListener("pointerdown", press, true);
    element.addEventListener("mousedown", hold, true);
    element.addEventListener("dblclick", double);
    doc.addEventListener("pointerdown", outside, true);
    doc.addEventListener("focusin", focus);
    element.addEventListener("keydown", key, true);
    win.addEventListener("resize", schedule);
    const unsubscribe = editor.subscribeState({ select: state => state.doc, change: () => {
      if (selected.value && !selected.value.anchor.getRange()) clear();
      revision.value++; schedule();
    } });
    // The retained caret would otherwise keep blinking in the text while an object owns focus.
    const stop = watch(selected, value => { element.toggleAttribute("data-md-object-selected", !!value); schedule(); });
    cleanup(() => {
      stop(); unsubscribe(); clear(); element.removeAttribute("data-md-object-selected");
      if (frame) win.cancelAnimationFrame(frame);
      element.removeEventListener("pointerdown", press, true);
      element.removeEventListener("mousedown", hold, true);
      element.removeEventListener("dblclick", double);
      doc.removeEventListener("pointerdown", outside, true);
      doc.removeEventListener("focusin", focus);
      element.removeEventListener("keydown", key, true);
      resize?.disconnect();
      win.removeEventListener("resize", schedule);
      schedule = () => undefined;
    });
  }, { immediate: true });

  return { selected, rect, revision, clear, moveCaret };
}
