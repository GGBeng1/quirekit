import type { InkScene } from '../../types';
import { backdropInstance } from '../shared/backdrop';
import { cloudsGlsl } from './shader';

/** 云海题材：视点抬高、群山沉在下半，云带缠在远峰山腰与峰顶之间；拖动时各层按远近错开。 */
export const clouds: InkScene = {
    name: 'clouds',
    defaultEye: 3,
    orbit: { angle: 0.4, eyeBelow: 0.6, eyeAbove: 0.8 },
    glsl: cloudsGlsl,
    create: (gl) => backdropInstance(gl),
};
