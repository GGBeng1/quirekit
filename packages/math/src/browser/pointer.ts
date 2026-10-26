import { hitMathGeometry, selectMathGeometry } from '../geometry/hit';
import type { MathCaret } from '../visual/types';
import { bindMathEvents } from './events';
import type { MathPointerBinding, MathPointerOptions } from './types';

/**
 * Owns one captured drag, with retained geometry and at most one tracking update per frame.
 * @param options - Explicit surface, selection authority and focus ports.
 * @returns Pointer ownership and idempotent teardown.
 */
export function bindMathPointer(options: MathPointerOptions): MathPointerBinding {
  const { surface, editor } = options;
  const window = surface.ownerDocument.defaultView!;
  let frame = 0;
  let pointer: number | undefined;
  let anchor: MathCaret | undefined;
  let latest: { left: number; top: number } | undefined;
  let updates = 0;
  /**
   * Projects a client point into the retained geometry's scrollable content space.
   * @param event - Native viewport point.
   */
  function point(event: MouseEvent): void {
    const rect = surface.getBoundingClientRect();
    latest = { left: event.clientX - rect.left - surface.clientLeft + surface.scrollLeft,
      top: event.clientY - rect.top - surface.clientTop + surface.scrollTop };
  }
  /** Accepts only the latest pending point; pointerup calls the same exact projection. */
  function accept(): void {
    frame = 0;
    if (!anchor || !latest || options.suspended()) return;
    editor.select(selectMathGeometry(options.geometry(), anchor, hitMathGeometry(options.geometry(), latest.left, latest.top)));
    updates++;
    options.changed();
  }
  /** Releases frame and capture before notifying, avoiding reentrant lost-capture cleanup. */
  function end(): void {
    window.cancelAnimationFrame(frame);
    frame = 0;
    const captured = pointer;
    pointer = undefined;
    anchor = undefined;
    latest = undefined;
    if (captured !== undefined && surface.hasPointerCapture(captured)) surface.releasePointerCapture(captured);
    if (captured !== undefined) options.changed();
  }
  /**
   * Starts a primary-button drag from complete structural boundaries.
   * @param event - Native pointer event.
   */
  function down(event: Event): void {
    const native = event as PointerEvent;
    if (options.suspended() || native.button !== 0 || pointer !== undefined) return;
    native.preventDefault();
    point(native);
    const hit = hitMathGeometry(options.geometry(), latest!.left, latest!.top);
    const selection = editor.getSnapshot().selection;
    anchor = native.shiftKey ? selection.anchor ?? selection.focus : hit;
    pointer = native.pointerId;
    editor.select(native.shiftKey ? selectMathGeometry(options.geometry(), anchor, hit) : { focus: hit });
    surface.setPointerCapture(pointer);
    options.focus();
    options.changed();
  }
  /**
   * Keeps the native input focused when iOS still performs compatibility mouse defaults.
   * @param event - Mouse event following the structural pointer interaction.
   */
  function mousedown(event: Event): void {
    // Cancelling pointerdown alone does not prevent iOS from blurring the capture.
    // Only protect this surface's input ownership; menus and IME retain their defaults.
    if (!options.suspended() && (event as MouseEvent).button === 0) event.preventDefault();
  }
  /**
   * Selects a complete deepest argument for direct replacement.
   * @param event - Native double-click event.
   */
  function double(event: Event): void {
    if (options.suspended()) return;
    event.preventDefault();
    point(event as MouseEvent);
    const hit = hitMathGeometry(options.geometry(), latest!.left, latest!.top);
    const slot = options.geometry().find(item => item.id === hit.slot);
    if (slot) editor.select({ anchor: { slot: hit.slot, index: 0 }, focus: { slot: hit.slot, index: slot.children.length } });
    options.focus();
  }
  /**
   * Keeps the newest point while bounding selection publications by animation frames.
   * @param event - Captured native pointer movement.
   */
  function move(event: Event): void {
    const native = event as PointerEvent;
    if (native.pointerId !== pointer || !anchor) return;
    point(native);
    if (!frame) frame = window.requestAnimationFrame(accept);
  }
  /**
   * Flushes the final real point before releasing the pointer's ownership.
   * @param event - Captured native pointer-up event.
   */
  function up(event: Event): void {
    if ((event as PointerEvent).pointerId !== pointer) return;
    window.cancelAnimationFrame(frame);
    point(event as PointerEvent);
    accept();
    end();
  }
  const remove = bindMathEvents(surface, { pointerdown: down, mousedown, pointermove: move, pointerup: up, dblclick: double, pointercancel: end, lostpointercapture: end });
  return {
    /** @returns Current pointer ownership. */
    isDragging: () => pointer !== undefined,
    /** @returns Number of tracking/final selection updates. */
    getUpdates: () => updates,
    end,
    /** Removes only this binding's listeners and transient pointer state. */
    destroy() {
      remove();
      end();
    },
  };
}
