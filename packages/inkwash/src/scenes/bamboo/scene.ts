import type { InkScene } from '../../types';
import { backdropInstance } from '../shared/backdrop';
import { bambooGlsl, STALK_COUNT } from './shader';

/** 竹竿布局（x 横向、z 纵深、高度、倾斜），按远到近排列；左右两丛，正中留白。 */
const STALKS: readonly (readonly [number, number, number, number])[] = [
    [-3.0, 28, 13, 0.02],
    [5.5, 26, 12, -0.03],
    [-6.8, 21, 12, 0.05],
    [7.6, 19, 11, -0.06],
    [-5.0, 16, 11, -0.04],
    [5.0, 14, 10, 0.07],
    [-3.6, 11, 9, 0.06],
    [3.4, 10, 9, -0.05],
    [-2.4, 7.5, 8, -0.08],
];

/** 竹题材：远近成丛的竹竿与竹叶，随风轻摆，拖动时环转。 */
export const bamboo: InkScene = {
    name: 'bamboo',
    defaultEye: 1.1,
    orbit: { angle: 0.4, eyeBelow: 0.4, eyeAbove: 0.8 },
    glsl: bambooGlsl,
    create: (gl) => {
        if (STALKS.length !== STALK_COUNT) throw new Error('STALKS must match STALK_COUNT');
        const packed = new Float32Array(STALKS.flat());
        return backdropInstance(gl, (context, program) => context.uniform4fv(program.uniforms['uStalks[0]']!, packed));
    },
};
