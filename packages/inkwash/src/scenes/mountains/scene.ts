import type { InkScene, InkSceneInstance } from '../../types';
import { computeSilhouettes, SILHOUETTE_COLUMNS } from './layout';
import { MOUNTAIN_ROWS, mountainsSceneGlsl } from './shader';
import type { SilhouetteFrame } from './types';
import { createMountainProfiles } from './profiles';

/**
 * 山水题材：近处两侧高山夹峙，远处正中是主峰；拖动时绕主峰环转。
 * 每帧把当前视角下的群山轮廓写进一张单通道纹理，着色器逐山叠墨。
 */
export const mountains: InkScene = {
    name: 'mountains',
    defaultEye: 1.1,
    orbit: { angle: 0.6, eyeBelow: 0.5, eyeAbove: 1.1 },
    glsl: mountainsSceneGlsl,
    create: createMountains,
};

/**
 * 为一张画布创建群山轮廓纹理；视角与宽高比不变时复用上一帧的轮廓，只在变化时重算上传。
 * @param gl WebGL2 上下文。
 * @returns 题材实例。
 */
export function createMountains(gl: WebGL2RenderingContext): InkSceneInstance {
    const silhouette = createSilhouetteTexture(gl);
    const profiles = createMountainProfiles(gl);
    let preparedTime = -Infinity;
    let cached: { frame: SilhouetteFrame; angle: number; eye: number; aspect: number } | null = null;
    return {
        prepare(context, view, seconds) {
            const stale = !cached || Math.abs(cached.angle - view.angle) > 1e-4
                || Math.abs(cached.eye - view.eye) > 1e-4 || cached.aspect !== view.aspect;
            if (stale) cached = { frame: computeSilhouettes(view.angle, view.eye, view.aspect), angle: view.angle, eye: view.eye, aspect: view.aspect };
            const frame = cached!.frame;
            context.activeTexture(context.TEXTURE0);
            context.bindTexture(context.TEXTURE_2D, silhouette);
            if (stale) context.texSubImage2D(context.TEXTURE_2D, 0, 0, 0, SILHOUETTE_COLUMNS, MOUNTAIN_ROWS, context.RED, context.FLOAT, frame.heights);
            if (stale || seconds !== preparedTime) profiles.paint(silhouette, frame, view.aspect, seconds);
            preparedTime = seconds;
        },
        bind(context, program, _view, unit) {
            const u = program.uniforms;
            const frame = cached!.frame;
            profiles.bind(program, unit);
            context.uniform1fv(u['uDistance[0]']!, frame.distances);
            context.uniform1fv(u['uPeak[0]']!, frame.peaks);
            context.uniform1fv(u['uBase[0]']!, frame.bases);
            context.uniform1fv(u['uSeed[0]']!, frame.indices);
            context.uniform1i(u.uMainRow!, frame.mainRow);
        },
        dispose(context) {
            profiles.dispose();
            context.deleteTexture(silhouette);
        },
    };
}

/**
 * 创建群山轮廓纹理：每行一座山，单通道 32 位浮点，最近邻取样（着色器内自行插值）。
 * @param gl WebGL2 上下文。
 * @returns 纹理。
 */
function createSilhouetteTexture(gl: WebGL2RenderingContext): WebGLTexture {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, SILHOUETTE_COLUMNS, MOUNTAIN_ROWS, 0, gl.RED, gl.FLOAT, null);
    return texture;
}
