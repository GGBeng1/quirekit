// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { createQuireSelectionHandles } from './mount';
import type { CreateQuireSelectionHandlesOptions, QuireSelectionHandlesController } from './types';

const cleanups: Array<() => void> = [];
const caret = { type: 'caret' as const, caret: { x: 10, y: 20, height: 18 } };
const range = { type: 'range' as const, anchor: caret.caret, focus: { x: 60, y: 20, height: 18 } };
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.useRealTimers(); });

/** @param options - Optional host callbacks and presentation. @returns Mounted public primitive with a capture-capable test overlay. */
function mount(options: Partial<CreateQuireSelectionHandlesOptions> = {}): QuireSelectionHandlesController {
  const controller = createQuireSelectionHandles({ ownerDocument: document, selection: caret, ...options });
  let captured: number | null = null;
  Object.assign(controller.element, {
    setPointerCapture: (id: number) => { captured = id; },
    hasPointerCapture: (id: number) => captured === id,
    releasePointerCapture: () => { captured = null; }
  });
  document.body.append(controller.element);
  cleanups.push(() => controller.destroy());
  return controller;
}

/** @param target - Acquiring grip or captured overlay. @param type - Pointer phase. @param pointerType - Browser device type. */
function pointer(target: HTMLElement, type = 'pointerdown', pointerType = 'touch'): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType, isPrimary: true, button: 0, clientX: 10, clientY: 20 }));
}

/** @param target - Original touch target. @param type - Touch phase. @returns Whether native handling was cancelled. */
function touch(target: HTMLElement, type = 'touchstart'): boolean {
  const event = new TouchEvent(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

/** @returns Whether a retargeted native long-press menu was cancelled. */
function contextMenu(): boolean {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
  document.body.dispatchEvent(event);
  return event.defaultPrevented;
}

it.each(['caret', 'anchor', 'focus'])('cancels native touch defaults from the %s grip', id => {
  const controller = mount({ selection: id === 'caret' ? caret : range });
  const button = controller.element.querySelector<HTMLButtonElement>(`[data-handle="${id}"] button`)!;
  expect(touch(button)).toBe(true);
  expect(touch(button, 'touchmove')).toBe(true);
  expect(touch(document.body)).toBe(false);
});

it('owns retargeted long-press menus while a held caret becomes a range', () => {
  vi.useFakeTimers();
  const onHold = vi.fn(() => controller.update({ selection: range }));
  const onDrag = vi.fn();
  const controller = mount({ onLongPressStart: onHold, onDrag });
  pointer(controller.element.querySelector<HTMLButtonElement>('[data-handle="caret"] button')!);
  vi.advanceTimersByTime(450);
  expect(onHold).toHaveBeenCalledTimes(1);
  expect(controller.element.querySelector<HTMLElement>('[data-handle="caret"]')!.hidden).toBe(true);
  expect(contextMenu()).toBe(true);
  for (let index = 0; index < 100; index++) expect(touch(controller.element, 'touchmove')).toBe(true);
  expect(onDrag).not.toHaveBeenCalled();
  pointer(controller.element, 'pointerup');
  expect(contextMenu()).toBe(false);
});

it.each(['cancel', 'disabled', 'hidden', 'destroy', 'blur', 'capture-lost', 'pointer-cancel', 'escape'] as const)('releases native-menu ownership on %s', reason => {
  const controller = mount();
  pointer(controller.element.querySelector<HTMLButtonElement>('[data-handle="caret"] button')!);
  expect(contextMenu()).toBe(true);
  if (reason === 'cancel') controller.cancel();
  else if (reason === 'disabled') controller.update({ selection: caret, disabled: true });
  else if (reason === 'hidden') controller.update({ selection: null });
  else if (reason === 'destroy') controller.destroy();
  else if (reason === 'blur') window.dispatchEvent(new Event('blur'));
  else if (reason === 'capture-lost') pointer(controller.element, 'lostpointercapture');
  else if (reason === 'pointer-cancel') pointer(controller.element, 'pointercancel');
  else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(contextMenu()).toBe(false);
  if (reason === 'disabled' || reason === 'hidden' || reason === 'destroy') expect(touch(controller.element)).toBe(false);
});

it('leaves mouse menus outside handles available even during a touch drag', () => {
  const controller = mount();
  const button = controller.element.querySelector<HTMLButtonElement>('[data-handle="caret"] button')!;
  expect(contextMenu()).toBe(false);
  pointer(button, 'pointerdown', 'mouse');
  expect(contextMenu()).toBe(false);
  controller.cancel();
  pointer(button);
  const mouse = new PointerEvent('contextmenu', { pointerType: 'mouse', bubbles: true, cancelable: true });
  document.body.dispatchEvent(mouse);
  expect(mouse.defaultPrevented).toBe(false);
});

it('only cancels an identified touch menu for the acquired pointer', () => {
  const controller = mount();
  pointer(controller.element.querySelector<HTMLButtonElement>('[data-handle="caret"] button')!);
  for (const pointerId of [8, 7]) {
    const event = new PointerEvent('contextmenu', { pointerType: 'touch', pointerId, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(pointerId === 7);
  }
});
