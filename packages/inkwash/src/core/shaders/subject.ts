import { noiseChunk } from './common';

/**
 * 缓存完整题材，保留题材内部的云雾遮挡与叠墨顺序。
 * @param sceneGlsl 题材着色器。
 * @returns 无流体依赖的片元着色器。
 */
export function subjectFragment(sceneGlsl: string): string {
    return `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uReveal;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec2 uClearCenter;
uniform vec2 uClearRadius;
${noiseChunk}
${sceneGlsl}
void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 fromCenter = (vUv - uClearCenter) * vec2(aspect, 1.0) / uClearRadius;
    float clearing = smoothstep(0.55, 1.15, length(fromCenter));
    outColor = vec4(paintScene(vUv, aspect, clearing, uPaper), 1.0);
}`;
}
