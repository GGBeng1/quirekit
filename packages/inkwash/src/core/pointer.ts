import type { PointerInk, PointerInkHandlers } from '../types';

const VELOCITY_FORCE = 1600;
const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], [role="tab"], [contenteditable]';

/**
 * 监听窗口指针：划过时带出墨丝，点在空白处向外推开一圈水波；在空白处按住拖动时报告拖动位移。
 * 画布本身不接收事件（位于表单之下），因此监听 window 并换算到画布坐标。
 * @param canvas 背景画布。
 * @param handlers 回调。
 * @param draggable 是否允许按住拖动（拖动期间禁止选中文字并显示抓手光标）。
 * @returns 交互句柄。
 */
export function createPointerInk(canvas: HTMLCanvasElement, handlers: PointerInkHandlers, draggable: boolean): PointerInk {
    let previous: { x: number; y: number } | null = null;
    let dragging = false;
    const style = document.documentElement.style;
    let savedSelect = style.userSelect;
    let savedCursor = style.cursor;

    const locate = (event: PointerEvent): { x: number; y: number } | null => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return null;
        return { x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height };
    };

    const onMove = (event: PointerEvent): void => {
        const point = locate(event);
        if (!point) { previous = null; return; }
        if (previous) {
            const dx = point.x - previous.x;
            const dy = point.y - previous.y;
            if (dragging) handlers.onDrag(dx, dy);
            const speed = Math.hypot(dx * (canvas.width / canvas.height), dy);
            if (speed > 0.0004 && !(event.target as Element | null)?.closest?.(INTERACTIVE)) {
                handlers.onSplat({ x: point.x, y: point.y, dx: dx * VELOCITY_FORCE, dy: dy * VELOCITY_FORCE, ink: Math.min(0.22, speed * 3), radius: 0.0009 });
            }
        }
        previous = point;
    };

    const onDown = (event: PointerEvent): void => {
        if ((event.target as Element | null)?.closest?.(INTERACTIVE)) return;
        const point = locate(event);
        if (!point) { previous = null; return; }
        handlers.onSplat({ x: point.x, y: point.y, dx: 220, dy: 0, ink: 0, radius: 0.003, burst: true });
        previous = point;
        if (!draggable) return;
        dragging = true;
        savedSelect = style.userSelect; savedCursor = style.cursor;
        style.userSelect = 'none'; style.cursor = 'grabbing';
    };

    const onUp = (): void => {
        if (!dragging) return;
        dragging = false;
        style.userSelect = savedSelect; style.cursor = savedCursor;
        handlers.onDragEnd();
    };
    const onLeave = (): void => { previous = null; onUp(); };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('pointerleave', onLeave);

    return {
        dispose() {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            window.removeEventListener('blur', onLeave);
            document.removeEventListener('pointerleave', onLeave);
            if (dragging) { style.userSelect = savedSelect; style.cursor = savedCursor; }
        },
    };
}
