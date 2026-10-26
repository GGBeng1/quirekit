import type { Mountain, SilhouetteFrame } from './types';

/** 屏幕横向采样列数。 */
export const SILHOUETTE_COLUMNS = 384;
/** 焦距（屏幕高度为 1）。 */
const FOCAL = 1.7;
/** 地平线在屏幕上的高度。 */
const HORIZON = 0.32;
const TARGET = { x: 0, z: 26 };
const ORBIT = 26;
const SAMPLES = 32;

/**
 * 群山布局：近处两侧高山夹峙（身在山中），中景岭峰交错，远处正中是最高的主峰。
 * 走向各异，视点环转时有的由岭变峰、有的由峰变岭。
 */
export const MOUNTAINS: Mountain[] = [
    { x: -4.6, z: 10, angle: 1.2, length: 6, width: 2.4, height: 7.5 },
    { x: 5.2, z: 12, angle: -1.05, length: 7.5, width: 2.6, height: 8.6 },
    { x: -8.5, z: 21, angle: 0.25, length: 10, width: 3.2, height: 6.2 },
    { x: 9, z: 25, angle: 2.8, length: 9, width: 3, height: 7.4 },
    { x: 1.5, z: 48, angle: 0.7, length: 13, width: 4.5, height: 17 },
    { x: -15, z: 40, angle: -0.35, length: 11, width: 4, height: 10 },
    { x: 16, z: 43, angle: 0.5, length: 11, width: 4.2, height: 11.5 },
    { x: -2.5, z: 19, angle: 1.5, length: 5, width: 2, height: 2.4 },
    { x: 6, z: 33, angle: 1.9, length: 8, width: 2.6, height: 5.5 },
    { x: -6, z: 31, angle: 2.4, length: 7, width: 2.4, height: 4.8 },
    { x: -3.2, z: 6, angle: 0.3, length: 3, width: 1.6, height: 1.8 },
    { x: 3.6, z: 7, angle: 2.6, length: 3.5, width: 1.8, height: 2.1 },
];
const MAIN_INDEX = 4;

/**
 * 一维值噪声（0–1）。
 * @param x 坐标。
 * @param seed 种子。
 * @returns 噪声值。
 */
function noise1(x: number, seed: number): number {
    const hash = (n: number): number => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return hash(i) * (1 - u) + hash(i + 1) * u;
}

/**
 * 山体高度：沿走向是有几处峰头的长岭，横截面是脊顶略圆的陡坡。
 * @param mountain 山。
 * @param index 山序号（噪声种子）。
 * @param x 世界 x。
 * @param z 世界 z。
 * @returns 高度（山外为 0）。
 */
function mountainHeight(mountain: Mountain, index: number, x: number, z: number): number {
    const ax = Math.cos(mountain.angle);
    const az = Math.sin(mountain.angle);
    const dx = x - mountain.x;
    const dz = z - mountain.z;
    const along = (dx * ax + dz * az) / mountain.length;
    const across = (-dx * az + dz * ax) / mountain.width;
    if (Math.abs(along) > 1 || Math.abs(across) > 1) return 0;
    const profile = (1 - along * along) * (0.68 + 0.5 * noise1(along * 3.4 + 10, index + 1));
    const section = Math.max(0, 1 - Math.sqrt(across * across + 0.004)) ** 1.5;
    return mountain.height * profile * section;
}

/**
 * 计算当前视角下每座山的屏幕轮廓：对每一列，沿该列视线穿过山体取样，取最大仰角投影到屏幕。
 * @param angle 视点绕主峰的环转角（弧度）。
 * @param eye 视点高度。
 * @param aspect 画面宽高比。
 * @returns 按远到近排序的轮廓。
 */
export function computeSilhouettes(angle: number, eye: number, aspect: number): SilhouetteFrame {
    const camera = { x: TARGET.x + Math.sin(angle) * ORBIT, z: TARGET.z - Math.cos(angle) * ORBIT };
    const forward = { x: TARGET.x - camera.x, z: TARGET.z - camera.z };
    const norm = Math.hypot(forward.x, forward.z);
    forward.x /= norm; forward.z /= norm;
    const right = { x: forward.z, z: -forward.x };
    const depthOf = (mountain: Mountain): number => (mountain.x - camera.x) * forward.x + (mountain.z - camera.z) * forward.z;
    const order = MOUNTAINS.map((mountain, index) => ({ mountain, index, depth: depthOf(mountain) })).sort((a, b) => b.depth - a.depth);
    const rows = order.length;
    const frame: SilhouetteFrame = {
        heights: new Float32Array(rows * SILHOUETTE_COLUMNS).fill(-1),
        distances: new Float32Array(rows), peaks: new Float32Array(rows), bases: new Float32Array(rows), indices: new Float32Array(rows),
        mainRow: order.findIndex((entry) => entry.index === MAIN_INDEX),
    };
    order.forEach(({ mountain, index, depth }, row) => {
        frame.distances[row] = depth;
        frame.indices[row] = index;
        frame.bases[row] = HORIZON + (0.3 - eye) / Math.max(depth, 1) * FOCAL;
        const radius = Math.max(mountain.length, mountain.width);
        let peak = -1;
        for (let column = 0; column < SILHOUETTE_COLUMNS; column++) {
            // 列视线（水平面内），与山的外接圆求交，只在交段内取样。
            const sx = (column / (SILHOUETTE_COLUMNS - 1) - 0.5) * aspect;
            const dir = { x: forward.x * FOCAL + right.x * sx, z: forward.z * FOCAL + right.z * sx };
            const length = Math.hypot(dir.x, dir.z);
            dir.x /= length; dir.z /= length;
            const ox = camera.x - mountain.x;
            const oz = camera.z - mountain.z;
            const b = ox * dir.x + oz * dir.z;
            const disc = b * b - (ox * ox + oz * oz - radius * radius);
            if (disc <= 0) continue;
            const root = Math.sqrt(disc);
            const near = Math.max(0.5, -b - root);
            const far = -b + root;
            if (far <= near) continue;
            const cosine = dir.x * forward.x + dir.z * forward.z;
            let best = -1;
            for (let sample = 0; sample <= SAMPLES; sample++) {
                const s = near + (far - near) * sample / SAMPLES;
                const h = mountainHeight(mountain, index, camera.x + dir.x * s, camera.z + dir.z * s);
                if (h <= 0) continue;
                best = Math.max(best, HORIZON + (h - eye) / (s * cosine) * FOCAL);
            }
            frame.heights[row * SILHOUETTE_COLUMNS + column] = best;
            peak = Math.max(peak, best);
        }
        frame.peaks[row] = peak;
    });
    return frame;
}
