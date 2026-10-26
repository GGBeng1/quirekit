import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInkWash } from './renderer';
import { mountains } from '../scenes/mountains';
import type { InkWashOptions, PointerInkHandlers } from '../types';

const state = vi.hoisted(() => ({
    paint: vi.fn(), present: vi.fn(), simulate: vi.fn(), dispose: vi.fn(), resize: vi.fn(() => true), setPalette: vi.fn(),
    handlers: null as PointerInkHandlers | null, intersection: null as ((entries: { isIntersecting: boolean }[]) => void) | null,
}));
vi.mock('./rendering/pipeline', () => ({ createPipeline: () => ({ ...state, active: false }) }));
vi.mock('./pointer', () => ({ createPointerInk: (_canvas: unknown, handlers: PointerInkHandlers) => {
    state.handlers = handlers; return { dispose: vi.fn() };
} }));
let now = 0;
let next = 0;
let queue = new Map<number, FrameRequestCallback>();
let doc: EventTarget & { hidden: boolean };
let canvas: HTMLCanvasElement;
let status: number;
let ready: ReturnType<typeof vi.fn<() => void>>;
const controllers: ReturnType<typeof createInkWash>[] = [];

/** @param time 模拟浏览器时间。 */
function frame(time: number): void {
    now = time; const entries = [...queue.values()]; queue.clear(); entries.forEach(cb => cb(time));
}
/** @param extra 测试配置。 @returns 当前渲染器。 */
function start(extra: Partial<InkWashOptions> = {}) {
    const result = createInkWash(canvas, { scene: mountains, palette: { paper: [1, 1, 1], ink: [0, 0, 0] }, orbit: 'drag', reducedMotion: false, onReady: ready, ...extra });
    controllers.push(result); return result;
}
beforeEach(() => {
    vi.clearAllMocks(); now = 0; next = 0; queue = new Map(); status = 3; state.handlers = null; ready = vi.fn();
    doc = Object.assign(new EventTarget(), { hidden: false });
    const gl = {
        TIMEOUT_EXPIRED: 1, WAIT_FAILED: 2, SYNC_GPU_COMMANDS_COMPLETE: 4,
        getExtension: () => ({ loseContext: vi.fn() }), fenceSync: () => ({}), flush: vi.fn(), deleteSync: vi.fn(), clientWaitSync: () => status,
    };
    canvas = Object.assign(new EventTarget(), { clientWidth: 3840, clientHeight: 2160, getContext: () => gl }) as unknown as HTMLCanvasElement;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', Object.assign(new EventTarget(), { devicePixelRatio: 2 }));
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { queue.set(++next, cb); return next; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => queue.delete(id));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('IntersectionObserver', class {
        constructor(cb: typeof state.intersection) { state.intersection = cb; } observe() {} disconnect() {}
    });
});
afterEach(() => { controllers.splice(0).forEach(c => c.destroy()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('shared render lifecycle', () => {
    it('presents and animates on every 120Hz browser frame without a fixed FPS cap', () => {
        start(); for (let i = 1; i <= 120; i++) frame(i * 1000 / 120);
        expect(state.present).toHaveBeenCalledTimes(120);
        expect(state.paint).toHaveBeenCalledTimes(120);
        expect(ready).toHaveBeenCalledTimes(1);
    });
    it('holds at most one GPU frame and submits only the newest pointer position when released', () => {
        start(); frame(16); status = 1;
        for (let x = 0; x < 1000; x++) state.handlers!.onSplat({ x, y: 0.5, dx: 1, dy: 0, ink: 0.01, radius: 0.001 });
        for (let i = 2; i < 40; i++) frame(i * 16);
        expect(state.present).toHaveBeenCalledTimes(1);
        status = 3; frame(650);
        expect(state.simulate.mock.calls.at(-1)![1]).toMatchObject({ x: 999, ink: 0.22, dx: 1000 });
        expect(state.present).toHaveBeenCalledTimes(2);
    });
    it('reuses a settled fixed subject for ink and wakes only when needed', () => {
        start({ ambient: false }); for (let i = 1; i <= 210; i++) frame(i * 16);
        expect(queue.size).toBe(0);
        const painted = state.paint.mock.calls.length;
        state.handlers!.onSplat({ x: 0.4, y: 0.5, dx: 1, dy: 0, ink: 0.1, radius: 0.001 }); frame(3400);
        expect(state.paint).toHaveBeenCalledTimes(painted);
        expect(state.simulate.mock.calls.at(-1)![1]).toMatchObject({ x: 0.4 });
    });
    it('renders frozen and reduced-motion scenes once, and supports palette/view updates', () => {
        const controller = start({ reducedMotion: true }); frame(16);
        expect(queue.size).toBe(0); expect(state.handlers).toBeNull();
        controller.setView({ angle: 0.2, eye: 1.4 }); frame(32);
        expect(controller.getView()).toMatchObject({ angle: 0.2, eye: 1.4 });
        controller.setPalette({ paper: [0, 0, 0], ink: [1, 1, 1] }); frame(48);
        expect(state.present).toHaveBeenCalledTimes(3); expect(queue.size).toBe(0);
    });
    it('suspends hidden/offscreen scenes and resumes without replaying queued input', () => {
        start(); frame(16); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
        state.handlers!.onSplat({ x: 0.5, y: 0.5, dx: 1, dy: 0, ink: 0.1, radius: 0.001 });
        frame(1000); expect(queue.size).toBe(0);
        doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); frame(1016);
        expect(state.simulate.mock.calls.at(-1)).toEqual([0.016, null]);
        state.intersection!([{ isIntersecting: false }]); expect(queue.size).toBe(0);
        state.intersection!([{ isIntersecting: true }]); frame(1032);
        expect(state.present).toHaveBeenCalledTimes(3);
    });
    it('releases resources once and ignores updates after destruction', () => {
        const controller = start(); frame(16); controller.destroy(); controller.destroy();
        controller.setView({ angle: 0.3 }); frame(32);
        expect(state.dispose).toHaveBeenCalledTimes(1); expect(queue.size).toBe(0);
    });
});
