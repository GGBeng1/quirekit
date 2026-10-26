import { trackQuireKitInputModality } from '../control/modality';
import { createSelectionHandleDrag } from './drag/controller';
import { canContinueHandleDrag, createHandle, getHandlePresentation, renderHandle, selectionHandleIds } from './dom/handles';
import type { CreateQuireSelectionHandlesOptions, QuireKitSelectionHandle, QuireKitSelectionHandlesProps, QuireSelectionHandlesController } from './types';

/**
 * Creates a controlled cursor/range overlay without importing an editor or framework.
 * @param options - Initial geometry, owning document and host callbacks.
 * @returns Stable DOM, update, cancellation and teardown methods.
 */
export function createQuireSelectionHandles(options: CreateQuireSelectionHandlesOptions): QuireSelectionHandlesController {
  const doc = options.ownerDocument;
  const win = doc.defaultView!;
  if (!win) throw new Error('Selection handles require a document with a window.');
  trackQuireKitInputModality(doc);
  const root = doc.createElement('div');
  root.className = 'qk-selection-handles';
  const nodes = { caret: createHandle(doc, 'caret'), anchor: createHandle(doc, 'anchor'), focus: createHandle(doc, 'focus') };
  let state: QuireKitSelectionHandlesProps = options;
  let destroyed = false;

  const drag = createSelectionHandleDrag({
    delay: (callback, ms) => win.setTimeout(callback, ms),
    cancelDelay: id => win.clearTimeout(id),
    schedule: callback => win.requestAnimationFrame(callback),
    cancelFrame: id => win.cancelAnimationFrame(id),
    onStart(detail) {
      root.dataset.dragging = '';
      nodes[detail.handle].root.dataset.dragging = '';
      listen(true);
      options.onDragStart?.(detail);
    },
    onMove: detail => options.onDrag?.(detail),
    onLongPressStart(detail) {
      render();
      options.onLongPressStart?.(detail);
    },
    onEnd(detail) {
      // Detach listeners and capture before invoking a consumer that may unmount or start anew.
      listen(false);
      delete root.dataset.dragging;
      const node = nodes[detail.handle];
      delete node.root.dataset.dragging;
      if (root.hasPointerCapture(detail.pointerId)) root.releasePointerCapture(detail.pointerId);
      render();
      options.onDragEnd?.(detail);
      if (!destroyed && detail.reason === 'release') options.onSelectionComplete?.(detail);
      if (!destroyed && detail.reason === 'long-press') options.onLongPress?.(detail);
    }
  });

  /** @param event - Browser input. @returns Whether this instance owns the pointer. */
  function owns(event: PointerEvent): boolean { return drag.current()?.pointerId === event.pointerId; }
  /** @param event - Claimed input that must not reach the editor's pointer handlers. */
  function consume(event: Event): void { event.preventDefault(); event.stopPropagation(); }
  /** @param event - Touch defaults are independent of PointerEvent cancellation. */
  function nativeTouch(event: TouchEvent): void {
    if (!destroyed && !state.disabled && state.selection) consume(event);
  }
  /** @param event - A touch menu may target text underneath the temporarily transparent grip. */
  function nativeContextMenu(event: MouseEvent): void {
    const current = drag.current();
    if (current?.pointerType !== 'touch') return;
    if ('pointerType' in event && event.pointerType && event.pointerType !== 'touch') return;
    if ('pointerId' in event && typeof event.pointerId === 'number' && event.pointerId > 0 && event.pointerId !== current.pointerId) return;
    consume(event);
  }
  /** @param event - Raw input; no DOM measurement occurs in this hot path. */
  function move(event: PointerEvent): void {
    if (!owns(event)) return;
    consume(event);
    drag.move(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  /** @param event - Actual final pointer sample, flushed before capture is released. */
  function release(event: PointerEvent): void {
    if (!owns(event)) return;
    consume(event);
    drag.release(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  /** @param event - OS cancellation, which must not apply an unaccepted coordinate. */
  function cancelPointer(event: PointerEvent): void { if (owns(event)) drag.cancel('cancel'); }
  /** Cancels when the browser window loses interaction ownership. */
  function blur(): void { drag.cancel('blur'); }
  /** Cancels suspended pages so there is no delayed input after returning. */
  function visibility(): void { if (doc.hidden) blur(); }
  /** @param event - Escape reaches the active session even while editor focus is retained. */
  function escape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    consume(event);
    drag.cancel('escape');
  }
  /** @param active - Install listeners only for the lifetime of a claimed gesture. */
  function listen(active: boolean): void {
    const method = active ? 'addEventListener' : 'removeEventListener';
    win[method]('pointermove', move as EventListener, true);
    win[method]('pointerup', release as EventListener, true);
    win[method]('pointercancel', cancelPointer as EventListener, true);
    win[method]('contextmenu', nativeContextMenu as EventListener, true);
    win[method]('keydown', escape as EventListener, true);
    win[method]('blur', blur);
    doc[method]('visibilitychange', visibility);
  }
  /** @param id - Stable handle. @param event - Pointer acquisition at the grip. */
  function begin(id: QuireKitSelectionHandle, event: PointerEvent): void {
    if (destroyed || state.disabled || drag.current() || event.button !== 0 || !event.isPrimary || !getHandlePresentation(state, id)) return;
    consume(event);
    const node = nodes[id];
    // Measure the actual CSS-scaled line once; keeping the grab offset prevents a first-frame jump.
    const rect = node.stem.getBoundingClientRect();
    // The overlay survives caret-to-range projection; a hidden caret button cannot keep capture.
    try { root.setPointerCapture(event.pointerId); }
    catch { return; } // An already cancelled native pointer cannot own a new drag.
    drag.begin({
      handle: id, pointerId: event.pointerId, pointerType: event.pointerType,
      point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      pointer: { x: event.clientX, y: event.clientY }
    }, state);
  }
  /** @param id - Endpoint receiving a physical arrow. @param event - Keyboard input. */
  function nudge(id: QuireKitSelectionHandle, event: KeyboardEvent): void {
    if (state.disabled || event.altKey || event.ctrlKey || event.metaKey || !getHandlePresentation(state, id)) return;
    const direction = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as const)[event.key as 'ArrowLeft'];
    if (!direction) return;
    consume(event);
    options.onNudge?.({ handle: id, direction, accelerated: event.shiftKey });
  }
  /** Reprojects bounded presentation without rebuilding captured or focused nodes. */
  function render(): void {
    const projection = { ...state, selecting: !!state.selecting || drag.selecting() };
    root.dataset.selecting = String(projection.selecting);
    for (const id of selectionHandleIds) renderHandle(nodes[id], getHandlePresentation(projection, id), !!state.disabled);
  }

  root.onlostpointercapture = event => { if (owns(event)) drag.cancel('capture-lost'); };
  root.onclick = consume;
  root.oncontextmenu = consume;
  // Cancel the original touch before the browser schedules its callout. Keep
  // listeners on the stable overlay across the caret-to-range projection.
  root.addEventListener('touchstart', nativeTouch, { passive: false });
  root.addEventListener('touchmove', nativeTouch, { passive: false });
  for (const id of selectionHandleIds) {
    const node = nodes[id];
    node.button.onpointerdown = event => begin(id, event);
    node.button.onkeydown = event => nudge(id, event);
    node.button.onclick = consume;
    node.button.oncontextmenu = consume;
    node.button.ondragstart = consume;
    root.append(node.root);
  }
  render();
  return {
    element: root,
    /** @param next - Complete controlled geometry and accessibility state. */
    update(next) {
      if (destroyed) return;
      const current = drag.current();
      const canContinue = !current || canContinueHandleDrag(state, next, current.handle, drag.selecting());
      state = next;
      if (!canContinue) {
        drag.cancel(next.disabled ? 'disabled' : 'selection-change');
      }
      render();
    },
    /** Cancels a stale host document target without reverting accepted host state. */
    cancel() { drag.cancel('cancel'); },
    /** Tears down capture, scheduling, listeners and the three permanent nodes. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      drag.cancel('destroy');
      root.onlostpointercapture = null;
      root.onclick = null;
      root.oncontextmenu = null;
      root.removeEventListener('touchstart', nativeTouch);
      root.removeEventListener('touchmove', nativeTouch);
      for (const { button } of Object.values(nodes)) {
        button.onpointerdown = button.onkeydown = null;
        button.onclick = button.oncontextmenu = button.ondragstart = null;
      }
      root.remove();
    }
  };
}
