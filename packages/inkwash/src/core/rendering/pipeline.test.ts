import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPipeline } from './pipeline';
import type { InkWashOptions } from '../../types';

const fluid = vi.hoisted(() => ({ step: vi.fn(), splat: vi.fn(), clear: vi.fn(), resize: vi.fn(), dispose: vi.fn() }));
vi.mock('../fluid', () => ({ InkFluid: class { step = fluid.step; splat = fluid.splat; clear = fluid.clear; resize = fluid.resize; dispose = fluid.dispose; } }));
vi.mock('../gl', () => ({
    createFullscreenTriangle: () => ({}), createProgram: () => ({ program: {}, uniforms: {} }),
    createTarget: (_gl: unknown, width: number, height: number) => ({ width, height }), deleteTarget: vi.fn(), bindTexture: () => 0,
}));

beforeEach(() => vi.clearAllMocks());

describe('simulation demand', () => {
    it('sleeps with no ink, dissipates using elapsed time, and clears before sleeping again', () => {
        const gl = new Proxy({}, { get: () => vi.fn() }) as WebGL2RenderingContext;
        const pipeline = createPipeline(gl, { width: 1, height: 1 } as HTMLCanvasElement, {
            scene: { create: () => ({ bind: vi.fn(), dispose: vi.fn() }), glsl: '' }, reducedMotion: false,
        } as unknown as InkWashOptions);
        pipeline.resize(3840, 2160, 2, 1);
        pipeline.simulate(0.016, null); expect(fluid.step).not.toHaveBeenCalled();
        const splat = { x: 0.5, y: 0.5, dx: 10, dy: 10, ink: 0.2, radius: 0.001 };
        pipeline.simulate(0.016, splat); expect(pipeline.active).toBe(true);
        pipeline.simulate(0.2, null);
        expect(fluid.step).toHaveBeenLastCalledWith(1 / 30, 0.2);
        pipeline.simulate(20, null); expect(fluid.clear).toHaveBeenCalledOnce(); expect(pipeline.active).toBe(false);
        const count = fluid.step.mock.calls.length;
        pipeline.simulate(0.016, null); expect(fluid.step).toHaveBeenCalledTimes(count);
        pipeline.simulate(0.016, splat); expect(pipeline.active).toBe(true);
        pipeline.resize(1920, 1080, 1, 1);
        expect(fluid.resize).toHaveBeenCalledTimes(1);
        expect(pipeline.active).toBe(true);
        pipeline.dispose();
    });
});
