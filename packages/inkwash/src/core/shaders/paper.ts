import { noiseChunk } from './common';

/** 纸纹与墨边颗粒只依赖像素位置，尺寸变化时一次烘焙，不随指针重复计算。 */
export const paperFragment = `#version 300 es
precision highp float;
out vec4 outColor;
${noiseChunk}
void main() {
    outColor = vec4(fbm(gl_FragCoord.xy * vec2(0.012, 0.09)), valueNoise(gl_FragCoord.xy * 1.3), 0.0, 1.0);
}`;
