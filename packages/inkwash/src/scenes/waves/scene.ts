import type { InkScene } from '../../types';
import { backdropInstance } from '../shared/backdrop';
import { CLIFF_COUNT, wavesGlsl } from './shader';

/** 江崖布局（x 横向、z 纵深、高度、宽度），按远到近排列；两侧高、正中矮。 */
const CLIFFS: readonly (readonly [number, number, number, number])[] = [
    [1.8, 30, 6.0, 2.4],
    [-6.5, 20, 9.0, 3.0],
    [7.5, 16, 7.5, 2.6],
    [-3.2, 10, 4.2, 1.6],
];

/** 海水江崖题材：透视铺开的海水纹，江崖石柱耸出水面，拖动时环转。 */
export const waves: InkScene = {
    name: 'waves',
    defaultEye: 1.1,
    orbit: { angle: 0.45, eyeBelow: 0.4, eyeAbove: 0.9 },
    glsl: wavesGlsl,
    create: (gl) => {
        if (CLIFFS.length !== CLIFF_COUNT) throw new Error('CLIFFS must match CLIFF_COUNT');
        const packed = new Float32Array(CLIFFS.flat());
        return backdropInstance(gl, (context, program) => context.uniform4fv(program.uniforms['uCliffs[0]']!, packed));
    },
};
