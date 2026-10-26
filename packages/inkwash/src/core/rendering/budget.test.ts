import { describe, expect, it, vi } from 'vitest';
import { canvasSize, createFrameGate } from './budget';

describe('ink wash work budget', () => {
    it.each([[3840, 2160, 2], [7680, 4320, 2], [5120, 1440, 1.5], [1440, 5120, 2]])('bounds backing pixels for %sx%s at DPR %s', (width, height, dpr) => {
        const size = canvasSize(width, height, dpr);
        expect(size[0] * size[1]).toBeLessThanOrEqual(1280 * 720);
        expect(Math.max(...size)).toBeLessThanOrEqual(2560);
        expect(size[0] / size[1]).toBeCloseTo(width / height, 2);
    });

    it('does not upscale small canvases beyond the DPR cap', () => {
        expect(canvasSize(100, 60, 3)).toEqual([150, 90]);
        expect(canvasSize(0, 0, 2)).toEqual([1, 1]);
    });

    it('never queues another frame while GPU work is incomplete', () => {
        const sync = {};
        const gl = {
            SYNC_GPU_COMMANDS_COMPLETE: 1, TIMEOUT_EXPIRED: 2, WAIT_FAILED: 3,
            fenceSync: vi.fn(() => sync), flush: vi.fn(), deleteSync: vi.fn(),
            clientWaitSync: vi.fn(() => 2),
        } as unknown as WebGL2RenderingContext;
        const gate = createFrameGate(gl);
        expect(gate.ready(0)).toBe(true);
        gate.submitted(0);
        expect(gate.ready(10)).toBe(false);
        expect(gl.clientWaitSync).toHaveBeenCalledTimes(1);
        for (let now = 40; now < 1000; now += 40) expect(gate.ready(now)).toBe(false);
        expect(gl.fenceSync).toHaveBeenCalledTimes(1);
        expect(gl.clientWaitSync).toHaveBeenLastCalledWith(sync, 0, 0);
        vi.mocked(gl.clientWaitSync).mockReturnValue(4);
        expect(gate.ready(1000)).toBe(true);
        expect(gate.scale).toBe(0.75);
        expect(gl.deleteSync).toHaveBeenCalledWith(sync);
        gate.submitted(1000);
        gate.dispose();
        expect(gl.deleteSync).toHaveBeenCalledTimes(2);
    });
});
