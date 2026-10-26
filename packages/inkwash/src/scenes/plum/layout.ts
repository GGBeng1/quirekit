import type { PlumBlossom, PlumLayout, PlumSegment } from './types';

/** 着色器能容纳的枝段数。 */
export const PLUM_SEGMENTS = 40;
/** 着色器能容纳的花朵数。 */
export const PLUM_BLOSSOMS = 24;

/**
 * 固定种子的伪随机数，保证每次生成同一枝梅。
 * @param seed 种子。
 * @returns 返回 0–1 随机数的函数。
 */
function random(seed: number): () => number {
    let state = seed >>> 0;
    return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/**
 * 生成一枝从左上画角横斜而下的老梅：先长完主干，再逐层长出分枝与细枝（广度优先，
 * 保证有限的枝段配额先用在主干上），细枝上开花、挂苞。世界坐标以画面平面为准：x 横向，y 为离地高度。
 * @returns 枝干与花朵。
 */
export function growPlum(): PlumLayout {
    const next = random(20261346);
    const segments: PlumSegment[] = [];
    const blossoms: PlumBlossom[] = [];
    const queue: { x: number; y: number; angle: number; length: number; width: number; depth: number }[] = [
        { x: -5.4, y: 6.4, angle: -0.25, length: 7.0, width: 0.4, depth: 3 },
    ];
    while (queue.length > 0 && segments.length < PLUM_SEGMENTS) {
        const branch = queue.shift()!;
        let px = branch.x;
        let py = branch.y;
        let a = branch.angle;
        const steps = branch.depth >= 2 ? 4 : 3;
        for (let step = 0; step < steps && segments.length < PLUM_SEGMENTS; step++) {
            // 老梅的枝一折一转：每段随机偏转，主干偏转小、细枝偏转大。
            a += (next() - 0.5) * (branch.depth >= 3 ? 0.5 : 0.8);
            const nx = px + Math.cos(a) * branch.length / steps;
            const ny = py + Math.sin(a) * branch.length / steps;
            const w0 = branch.width * (1 - step * 0.2);
            const w1 = branch.width * (1 - (step + 1) * 0.2);
            segments.push({ x0: px, y0: py, x1: nx, y1: ny, w0, w1 });
            if (branch.depth > 0 && step > 0 && next() < 0.6) {
                const side = next() < 0.5 ? -1 : 1;
                queue.push({ x: nx, y: ny, angle: a + side * (0.55 + next() * 0.45), length: branch.length * 0.48, width: w1 * 0.6, depth: branch.depth - 1 });
            }
            if (branch.depth <= 1 && blossoms.length < PLUM_BLOSSOMS && next() < 0.7) {
                blossoms.push({ x: nx + (next() - 0.5) * 0.35, y: ny + (next() - 0.5) * 0.35, r: 0.16 + next() * 0.08, open: next() < 0.7 });
            }
            px = nx;
            py = ny;
        }
        if (branch.depth > 0) {
            queue.push({ x: px, y: py, angle: a + 0.3 + next() * 0.3, length: branch.length * 0.45, width: branch.width * 0.4, depth: branch.depth - 1 });
        } else if (blossoms.length < PLUM_BLOSSOMS) {
            blossoms.push({ x: px, y: py, r: 0.2, open: true });
        }
    }
    return { segments, blossoms };
}

/**
 * 把布局打包成着色器的 uniform 数组；不足的位置以零半径占位。
 * @param layout 梅枝布局。
 * @returns 枝段端点、枝段粗细与花朵三个数组。
 */
export function packPlum(layout: PlumLayout): { segments: Float32Array; widths: Float32Array; blossoms: Float32Array } {
    const segments = new Float32Array(PLUM_SEGMENTS * 4);
    const widths = new Float32Array(PLUM_SEGMENTS * 2);
    const blossoms = new Float32Array(PLUM_BLOSSOMS * 4);
    layout.segments.slice(0, PLUM_SEGMENTS).forEach((s, i) => {
        segments.set([s.x0, s.y0, s.x1, s.y1], i * 4);
        widths.set([s.w0, s.w1], i * 2);
    });
    layout.blossoms.slice(0, PLUM_BLOSSOMS).forEach((b, i) => blossoms.set([b.x, b.y, b.r, b.open ? 1 : 0], i * 4));
    return { segments, widths, blossoms };
}
