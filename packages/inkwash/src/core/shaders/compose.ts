/**
 * 合成缓存题材、流体墨迹和纸纹；不重新执行题材的噪声与几何计算。
 * @returns 完整的片元着色器源码。
 */
export function composeFragment(): string {
    return /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform vec3 uInk;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec2 uDyeTexel;
uniform float uDistort;
uniform vec2 uClearCenter;
uniform vec2 uClearRadius;
uniform sampler2D uGrain;
uniform sampler2D uScene;

void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUv - texture(uVelocity, vUv).xy * uDistort;
    vec2 fromCenter = (vUv - uClearCenter) * vec2(aspect, 1.0) / uClearRadius;
    float clearing = smoothstep(0.55, 1.15, length(fromCenter));
    vec3 color = texture(uScene, uv).rgb;

    // 流体墨迹：浓度决定墨色，浓度梯度处略积墨成边。
    float dye = texture(uDye, vUv).r;
    float left = texture(uDye, vUv - vec2(uDyeTexel.x, 0.0)).r;
    float right = texture(uDye, vUv + vec2(uDyeTexel.x, 0.0)).r;
    float bottom = texture(uDye, vUv - vec2(0.0, uDyeTexel.y)).r;
    float top = texture(uDye, vUv + vec2(0.0, uDyeTexel.y)).r;
    vec2 grain = texture(uGrain, vUv).rg;
    float edge = length(vec2(right - left, top - bottom));
    float inkAlpha = (1.0 - exp(-dye * 1.3)) * 0.42 * (0.88 + 0.24 * grain.y) + smoothstep(0.004, 0.05, edge) * 0.18;
    color = mix(color, uInk, clamp(inkAlpha, 0.0, 0.5) * mix(0.45, 1.0, clearing));

    color = mix(color, uInk, 0.022 * grain.x);
    outColor = vec4(color, 1.0);
}`;
}
