import { HALL_COUNT } from './shader';
import type { Hall } from './types';

/**
 * 宫城楼阁，仿故宫中轴：北墙两端的角楼、后宫的乾清宫与两侧配殿、三台上的保和殿、中和殿、太和殿，
 * 以及广场两侧廊庑上的体仁阁与弘义阁。数组按远到近排列，着色器在宫墙、廊庑、三台之间按远近穿插叠墨。
 */
export const HALLS: readonly Hall[] = [
    { x: -19, z: 80, tiers: 3, seed: 3.1, size: 1, lift: 1.2 },
    { x: 19, z: 80, tiers: 3, seed: 5.3, size: 1, lift: 1.2 },
    { x: 0, z: 58, tiers: 2, seed: 7.4, size: 1.4, lift: 0.6 },
    { x: -8, z: 56, tiers: 1, seed: 9.2, size: 1, lift: 0 },
    { x: 8, z: 56, tiers: 1, seed: 11.9, size: 1, lift: 0 },
    { x: 0, z: 40, tiers: 2, seed: 13.6, size: 1.4, lift: 1.5 },
    { x: 0, z: 35, tiers: 1, seed: 15.1, size: 1, lift: 1.5 },
    { x: 0, z: 30, tiers: 2, seed: 17.2, size: 1.9, lift: 1.5 },
    { x: -9, z: 24, tiers: 2, seed: 19.8, size: 1.1, lift: 0 },
    { x: 9, z: 24, tiers: 2, seed: 23.3, size: 1.1, lift: 0 },
];

/**
 * 把楼阁布局打包成着色器的 vec4 数组：每座楼阁两项，(x, z, 重数, 种子) 与 (尺寸, 台基高, 0, 0)。
 * @returns 长度为 8×HALL_COUNT 的数组。
 */
export function packHalls(): Float32Array {
    if (HALLS.length !== HALL_COUNT) throw new Error('HALLS must match HALL_COUNT');
    return new Float32Array(HALLS.flatMap((hall) => [hall.x, hall.z, hall.tiers, hall.seed, hall.size, hall.lift, 0, 0]));
}
