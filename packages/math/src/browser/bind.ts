import { getMathOverlay } from '../geometry/overlay';
import { projectMathGeometry } from '../geometry/project';
import type { MathSurfaceRect, MathSurfaceSlot } from '../geometry/types';
import type { MathFormulaLayout } from '../output/layout/types';
import { freezeMathValue } from '../shared/freeze';
import { bindMathInput } from './input';
import { bindMathPointer } from './pointer';
import { revealMathCaret } from './viewport';
import type { MathBrowserBinding, MathBrowserOptions, MathBrowserSnapshot } from './types';

/**
 * Binds browser interaction without creating UI, painting overlays or assuming backend markup.
 * @param options - Explicit borrowed editor, elements and optional interaction policy.
 * @returns Stable numeric external store and a disposable native binding.
 */
export function bindMathEditor(options: MathBrowserOptions): MathBrowserBinding {
  const { editor, surface, input } = options;
  const window = surface.ownerDocument.defaultView;
  if (!window || input.ownerDocument !== surface.ownerDocument) throw new Error('Formula elements must share a mounted browser document');
  let alive = true;
  let mounted: MathFormulaLayout | undefined;
  let geometry: readonly MathSurfaceSlot[] = [];
  let measurements = 0;
  let snapshot: MathBrowserSnapshot = freezeMathValue({ geometry, overlay: { selected: [] }, dragging: false, measurements: 0, pointerUpdates: 0 });
  const listeners = new Set<(snapshot: MathBrowserSnapshot) => void>();
  const removeInput = bindMathInput(editor, input);
  /**
   * Reads pointer ownership without parsing source, touching glyphs or starting layout.
   * @returns Whether current model/graphic correlation or input ownership blocks pointing.
   */
  function suspended(): boolean {
    const current = editor.getSnapshot();
    return !current.canEdit || current.composing || current.commandOpen || !geometry.length || options.suspended?.() === true;
  }
  /** Restores native focus without causing page scroll. */
  function focus(): void {
    if (alive && editor.getSnapshot().canEdit) input.focus({ preventScroll: true });
  }
  const pointer = bindMathPointer({ editor, surface, geometry: () => geometry, suspended, focus, changed: publish });
  /**
   * Compares four numeric cursor values without traversing the retained formula geometry.
   * @param a - Newly projected cursor.
   * @param b - Retained cursor.
   * @returns Whether their surface dimensions match.
   */
  function sameRect(a: MathSurfaceRect | undefined, b: MathSurfaceRect | undefined): boolean {
    return a === b || !!a && !!b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
  }
  /** Publishes numeric decorations only; retained graphic identity stays consumer-owned. */
  function publish(): void {
    if (!alive) return;
    const current = editor.getSnapshot();
    const value = getMathOverlay(geometry, current.selection, options.overlay);
    const previous = snapshot.overlay;
    const unchanged = value.active === previous.active && sameRect(value.caret, previous.caret)
      && value.selected.length === previous.selected.length && value.selected.every((rect, index) => rect === previous.selected[index]);
    const overlay = unchanged ? previous : value;
    const inputAnchor = overlay.caret ?? snapshot.inputAnchor;
    const next = { geometry, overlay, inputAnchor, measurements, pointerUpdates: pointer.getUpdates(), dragging: pointer.isDragging() };
    // Pointer points remain authoritative during drag; only keyboard input follows the cursor.
    if (overlay.caret && current.focused && !pointer.isDragging() && !suspended()) revealMathCaret(surface, overlay.caret);
    if (geometry === snapshot.geometry && overlay === snapshot.overlay && inputAnchor === snapshot.inputAnchor
      && measurements === snapshot.measurements && next.pointerUpdates === snapshot.pointerUpdates && next.dragging === snapshot.dragging) return;
    snapshot = freezeMathValue(next);
    if (inputAnchor) {
      input.style.left = `${inputAnchor.left}px`;
      input.style.top = `${inputAnchor.top}px`;
    }
    for (const listener of [...listeners]) listener(snapshot);
  }
  /** Measures only a consumer-confirmed graphic, never a new model against old DOM. */
  function measure(): void {
    if (!alive) return;
    const current = editor.getSnapshot();
    const graphic = options.graphic();
    if (!mounted || !current.presentation.ready || current.presentation.layout !== mounted || !graphic || !mounted.width || !mounted.height) {
      geometry = [];
      publish();
      return;
    }
    const origin = surface.getBoundingClientRect();
    const box = graphic.getBoundingClientRect();
    measurements++;
    geometry = freezeMathValue(projectMathGeometry(mounted, {
      left: box.left - origin.left - surface.clientLeft + surface.scrollLeft,
      top: box.top - origin.top - surface.clientTop + surface.scrollTop,
      scaleX: box.width / mounted.width,
      scaleY: box.height / mounted.height,
    }));
    publish();
  }
  /** Invalidates obsolete geometry synchronously; consumer confirmation starts the next projection. */
  function sync(): void {
    const current = editor.getSnapshot();
    if (!current.presentation.ready || current.presentation.layout !== mounted || current.disposed) {
      if (geometry.length) {
        geometry = [];
        mounted = undefined;
        pointer.end();
      }
    }
    if (current.disposed || !current.canEdit || current.composing || current.commandOpen) pointer.end();
    publish();
  }
  const observer = new window.ResizeObserver(measure);
  observer.observe(surface);
  let graphic: Element | undefined;
  const unsubscribe = editor.subscribe(sync);
  return {
    /** @returns Retained immutable browser facts without DOM reads. */
    getSnapshot: () => snapshot,
    /**
     * @param listener - Browser fact listener.
     * @returns Idempotent unsubscribe.
     */
    subscribe(listener) {
      if (!alive) return () => {};
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /**
     * @param layout - Consumer-installed current output.
     * @returns Whether confirmed geometry is available.
     */
    setRenderedLayout(layout) {
      if (!alive) return false;
      if (!layout) {
        mounted = undefined;
        geometry = [];
        pointer.end();
        if (graphic) observer.unobserve(graphic);
        graphic = undefined;
        publish();
        return false;
      }
      const current = editor.getSnapshot();
      if (layout !== current.presentation.layout || !current.presentation.ready) return false;
      const next = options.graphic() ?? undefined;
      if (mounted === layout && graphic === next && geometry.length) return true;
      pointer.end();
      mounted = layout;
      if (graphic !== next) {
        if (graphic) observer.unobserve(graphic);
        graphic = next;
        if (graphic) observer.observe(graphic);
      }
      measure();
      return geometry.length > 0;
    },
    refresh: measure, focus,
    /** Releases only this binding's events, observers and pointer/native ownership. */
    destroy() {
      if (!alive) return;
      alive = false;
      unsubscribe();
      observer.disconnect();
      pointer.destroy();
      removeInput();
      listeners.clear();
    },
  };
}
