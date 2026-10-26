import type { InkScene, InkSceneInstance } from '../../types';
import { packHalls } from './layout';
import { architectureGlsl } from './shader';
import { viewOnlyInstance } from '../shared/view';

/**
 * 界画宫城题材：仿故宫中轴，高视点俯瞰，广场留白给标题，拖动时绕宫城环转。
 * 题材状态只有布局常量和两个视角 uniform，不需要纹理。
 */
export const architecture: InkScene = {
    name: 'architecture',
    defaultEye: 1.1,
    orbit: { angle: 0.5, eyeBelow: 0.4, eyeAbove: 2, travel: 26 },
    glsl: architectureGlsl,
    create: createArchitecture,
};

/**
 * 为一张画布创建题材实例。
 * @param _gl WebGL2 上下文（题材不建纹理，用不到）。
 * @returns 题材实例。
 */
function createArchitecture(_gl: WebGL2RenderingContext): InkSceneInstance {
    const halls = packHalls();
    return viewOnlyInstance((context, program) => context.uniform4fv(program.uniforms['uHalls[0]']!, halls));
}
