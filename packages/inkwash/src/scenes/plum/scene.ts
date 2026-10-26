import type { InkScene } from '../../types';
import { backdropInstance } from '../shared/backdrop';
import { growPlum, packPlum } from './layout';
import { plumGlsl } from './shader';

/** 梅题材：左上画角横斜而下的一枝老梅，枝上梅花与花苞，远处一轮淡月；拖动时轻微环转。 */
export const plum: InkScene = {
    name: 'plum',
    defaultEye: 1.1,
    orbit: { angle: 0.25, eyeBelow: 0.3, eyeAbove: 0.5 },
    glsl: plumGlsl,
    create: (gl) => {
        const packed = packPlum(growPlum());
        return backdropInstance(gl, (context, program) => {
            const u = program.uniforms;
            context.uniform4fv(u['uSegments[0]']!, packed.segments);
            context.uniform4fv(u['uWidths[0]']!, packed.widths);
            context.uniform4fv(u['uBlossoms[0]']!, packed.blossoms);
        });
    },
};
