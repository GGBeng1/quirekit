import { bindTexture, createFullscreenTriangle, createProgram, createTarget, deleteTarget } from '../../core/gl';
import { fullscreenVertex, noiseChunk } from '../../core/shaders/common';
import type { SilhouetteFrame } from './types';
import type { ShaderProgram } from '../../types';

const ROWS = 12;
const COLUMNS = 1536;
const fragment = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D uSilhouette;
uniform float uPeak[${ROWS}];
uniform float uBase[${ROWS}];
uniform float uSeed[${ROWS}];
uniform float uDistance[${ROWS}];
uniform float uAspect;
uniform float uTime;
${noiseChunk}
void main() {
    int row = int(gl_FragCoord.y);
    float x = (gl_FragCoord.x - 0.5) / ${COLUMNS - 1}.0;
    float source = x * float(textureSize(uSilhouette, 0).x - 1);
    int left = int(source);
    float silhouette = mix(texelFetch(uSilhouette, ivec2(left, row), 0).r,
        texelFetch(uSilhouette, ivec2(min(left + 1, textureSize(uSilhouette, 0).x - 1), row), 0).r, fract(source));
    float seed = uSeed[row] * 11.3 + 2.0;
    float span = max(uPeak[row] - uBase[row], 0.05);
    float rise = clamp((silhouette - uBase[row]) / span, 0.0, 1.0);
    float crag = 0.0;
    float amplitude = 0.5;
    float frequency = x * uAspect * 18.0 / sqrt(span);
    for (int octave = 0; octave < 4; octave++) {
        crag += amplitude * (1.0 - abs(valueNoise(vec2(frequency, seed + float(octave) * 5.3)) * 2.0 - 1.0));
        frequency *= 2.2;
        amplitude *= 0.45;
    }
    silhouette += span * 0.05 * (crag - 0.5) * rise;
    float near = exp(-uDistance[row] * 0.032);
    float width = (0.0012 + 0.0016 * valueNoise(vec2(x * 30.0, seed))) * (0.6 + near);
    float stroke = smoothstep(0.2, 0.4, valueNoise(vec2(x * uAspect * 10.0, seed + 5.0)));
    float mist = uBase[row] + span * (0.3 + 0.28 * fbm(vec2(x * uAspect * 2.5 - uTime * 0.012, seed)));
    outColor = vec4(silhouette, width, stroke, mist);
}`;

/**
 * 将只依赖横坐标的山脊、勾线和雾线计算压缩到每座山的一行。
 * @param gl WebGL2 上下文。
 * @returns 可准备和绑定的列纹理。
 */
export function createMountainProfiles(gl: WebGL2RenderingContext) {
    const target = createTarget(gl, COLUMNS, ROWS, 'float');
    const program = createProgram(gl, fullscreenVertex, fragment);
    const vao = createFullscreenTriangle(gl);
    return {
        /**
         * @param silhouette 原始轮廓纹理。
         * @param frame 当前投影参数。
         * @param aspect 画面宽高比。
         * @param seconds 环境时间。
         */
        paint(silhouette: WebGLTexture, frame: SilhouetteFrame, aspect: number, seconds: number): void {
            const u = program.uniforms;
            gl.useProgram(program.program); gl.bindVertexArray(vao);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, silhouette);
            gl.uniform1i(u.uSilhouette!, 0);
            gl.uniform1fv(u['uPeak[0]']!, frame.peaks); gl.uniform1fv(u['uBase[0]']!, frame.bases);
            gl.uniform1fv(u['uSeed[0]']!, frame.indices); gl.uniform1fv(u['uDistance[0]']!, frame.distances);
            gl.uniform1f(u.uAspect!, aspect); gl.uniform1f(u.uTime!, seconds);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer); gl.viewport(0, 0, COLUMNS, ROWS);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        /** @param scene 主体程序。 @param unit 纹理单元。 */
        bind(scene: ShaderProgram, unit: number): void { gl.uniform1i(scene.uniforms.uMountainProfiles!, bindTexture(gl, target, unit)); },
        /** 释放列纹理与准备程序。 */
        dispose(): void { deleteTarget(gl, target); gl.deleteProgram(program.program); gl.deleteVertexArray(vao); },
    };
}
