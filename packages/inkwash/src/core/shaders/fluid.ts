const header = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uTexel;`;

/** 半拉格朗日平流：沿速度回溯取样，并按耗散系数衰减。 */
export const advectionFragment = `${header}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float uDt;
uniform float uDissipation;
void main() {
    vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
    outColor = texture(uSource, coord) * uDissipation;
}`;

/** 速度场散度。 */
export const divergenceFragment = `${header}
uniform sampler2D uVelocity;
void main() {
    float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    outColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}`;

/** 速度场旋度。 */
export const curlFragment = `${header}
uniform sampler2D uVelocity;
void main() {
    float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float bottom = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
    float top = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
    outColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
}`;

/** 涡量约束：把被数值耗散抹平的小涡旋补回来，墨迹才会卷出丝缕。 */
export const vorticityFragment = `${header}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uStrength;
uniform float uDt;
void main() {
    float left = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float right = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float bottom = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
    float top = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
    float center = texture(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
    force = force / (length(force) + 1e-4) * uStrength * center * vec2(1.0, -1.0);
    vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;
    outColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}`;

/** 压力泊松方程的一次雅可比迭代。 */
export const pressureFragment = `${header}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
    float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float divergence = texture(uDivergence, vUv).x;
    outColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

/** 减去压力梯度，得到无散度的速度场。 */
export const gradientFragment = `${header}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
    float left = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float right = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float bottom = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float top = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    vec2 velocity = texture(uVelocity, vUv).xy - 0.5 * vec2(right - left, top - bottom);
    outColor = vec4(velocity, 0.0, 1.0);
}`;

/** 按系数缩放整张纹理（压力场每帧预衰减）。 */
export const scaleFragment = `${header}
uniform sampler2D uSource;
uniform float uScale;
void main() { outColor = texture(uSource, vUv) * uScale; }`;

/** 注入：高斯核叠加一个值；uRadial 为 1 时按离心方向注入速度（墨滴炸开）。 */
export const splatFragment = `${header}
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspect;
uniform float uRadial;
void main() {
    vec2 offset = vUv - uPoint;
    offset.x *= uAspect;
    float weight = exp(-dot(offset, offset) / uRadius);
    // 离心速度在圆心处渐弱为 0，避免奇点处卷出小涡。
    vec2 radial = normalize(offset + 1e-5) * uValue.x * min(1.0, length(offset) / sqrt(uRadius));
    vec3 value = mix(uValue, vec3(radial, 0.0), uRadial);
    outColor = vec4(texture(uTarget, vUv).xyz + value * weight, 1.0);
}`;
