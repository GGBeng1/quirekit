import { onBeforeUnmount, ref, type Ref } from 'vue';
import type { PreviewPoint, PreviewTransform } from './types';

/** @param stage - Pointer capture owner. @param transform - Current image controls. @param navigate - Request adjacent image. @returns Stage event handlers with no document-level listeners. */
export function usePreviewGestures(stage: Ref<HTMLElement | null>, transform: PreviewTransform, navigate: (delta: number) => void) {
  const points = new Map<number, PreviewPoint>();
  const dragging = ref(false);
  let last: PreviewPoint = { x: 0, y: 0 };
  let start: PreviewPoint = { x: 0, y: 0 };
  let distance = 0;
  let swipe = false;
  let moved = false;
  let lastTap = 0;
  onBeforeUnmount(() => {
    const captured = [...points.keys()]; points.clear();
    for (const id of captured) if (stage.value?.hasPointerCapture(id)) stage.value.releasePointerCapture(id);
  });
  /** @param event - Pointer in viewport coordinates. @returns Stage-centered CSS point. */
  function point(event: { clientX: number; clientY: number }): PreviewPoint {
    const rect = stage.value!.getBoundingClientRect();
    return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 };
  }
  /** @returns Active gesture centroid. */
  function center(): PreviewPoint {
    const values = [...points.values()];
    return values.reduce((sum, value) => ({ x: sum.x + value.x / values.length, y: sum.y + value.y / values.length }), { x: 0, y: 0 });
  }
  /** @returns First two fingers' distance. */
  function span(): number { const [a, b] = [...points.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; }
  /** @param event - Pointer starting a stage gesture. */
  function down(event: PointerEvent): void {
    if (!transform.ready.value || event.button !== 0 || points.size >= 2) return;
    points.set(event.pointerId, point(event)); stage.value?.setPointerCapture(event.pointerId);
    last = center(); distance = span();
    if (points.size === 1) { start = last; moved = false; swipe = event.pointerType === 'touch' && transform.scale.value <= transform.fitRatio.value + 0.001; }
    else { swipe = false; moved = true; lastTap = 0; }
    dragging.value = true;
  }
  /** @param event - Captured pointer movement. */
  function move(event: PointerEvent): void {
    if (!points.has(event.pointerId)) return;
    points.set(event.pointerId, point(event)); const next = center();
    if (Math.hypot(next.x - start.x, next.y - start.y) > 5) moved = true;
    if (points.size > 1) {
      const current = span();
      if (distance > 0) transform.zoomTo(transform.scale.value * current / distance, last);
      transform.panTo({ x: transform.offset.value.x + next.x - last.x, y: transform.offset.value.y + next.y - last.y });
      distance = current;
    } else if (!swipe) transform.panTo({ x: transform.offset.value.x + next.x - last.x, y: transform.offset.value.y + next.y - last.y });
    last = next;
  }
  /** @param event - Pointer completion or cancellation. */
  function end(event: PointerEvent): void {
    if (!points.has(event.pointerId)) return;
    const cancelled = event.type !== 'pointerup';
    if (cancelled) lastTap = 0;
    const finish = point(event);
    const horizontal = finish.x - start.x;
    const vertical = finish.y - start.y;
    points.delete(event.pointerId);
    if (points.size === 0) {
      dragging.value = false;
      if (!cancelled && swipe && Math.abs(horizontal) > 60 && Math.abs(horizontal) > Math.abs(vertical) * 1.5) navigate(horizontal < 0 ? 1 : -1);
      else if (!cancelled && !moved && event.pointerType === 'touch') {
        const now = Date.now(); if (now - lastTap < 300) { transform.toggle(finish); lastTap = 0; } else lastTap = now;
      }
    } else { last = center(); distance = span(); swipe = false; moved = true; }
    // Release only after state publication: lostpointercapture may be delivered synchronously.
    if (stage.value?.hasPointerCapture(event.pointerId)) stage.value.releasePointerCapture(event.pointerId);
  }
  /** @param event - Wheel scroll within the image stage. */
  function wheel(event: WheelEvent): void {
    if (!transform.ready.value) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
    transform.zoomTo(transform.scale.value * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.004), point(event));
  }
  /** @param event - Mouse double-click, independent of touch tap recognition. */
  function doubleClick(event: MouseEvent): void { transform.toggle(point(event)); }
  return { dragging, down, move, end, wheel, doubleClick };
}
