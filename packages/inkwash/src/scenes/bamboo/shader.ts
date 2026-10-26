import { backdropGlsl } from '../shared/backdrop';
import { viewGlsl } from '../shared/view';

/** 竹竿数量（与 scene.ts 的 STALKS 一致）。 */
export const STALK_COUNT = 9;

/**
 * 竹：远近几层竹竿，竿身按圆柱明暗渲染、竹节加重；竹叶成簇长在上部的节上，随风轻摆。
 * 按远到近叠墨，近处的竹竿与竹叶用纸色盖住身后。
 */
export const bambooGlsl = /* glsl */ `
${viewGlsl}
${backdropGlsl}
uniform vec4 uStalks[${STALK_COUNT}];
const float BAMBOO_ORBIT_CENTER = 14.0;

float bambooHash(float n) {
    return fract(sin(n * 12.9898) * 43758.5453);
}

// 一片竹叶：p 为叶片坐标（x 沿叶脉从叶柄向叶尖，y 横向）；返回 (覆盖, 叶脉)。
vec2 leafBlade(vec2 p, float len, float wid, float px) {
    float t = p.x / len;
    if (t < 0.0 || t > 1.0) return vec2(0.0);
    float halfWidth = wid * pow(sin(3.14159 * t), 0.7) * (1.0 - 0.45 * t);
    float cover = 1.0 - smoothstep(halfWidth - px, halfWidth + px, abs(p.y));
    float rib = smoothstep(px * 1.6, 0.0, abs(p.y)) * step(t, 0.85);
    return vec2(cover, rib);
}

vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color) {
    // 竹林后的远山，淡而远。
    color = paintMountains(uv, aspect, clearing, color, 20.0, 0.4);
    float horizon = 0.28 - (uEye - 1.1) * 0.12;
    for (int i = 0; i < ${STALK_COUNT}; i++) {
        vec4 stalk = uStalks[i];
        float seed = float(i) * 3.7 + 1.0;
        vec2 view = orbitView(stalk.xy, BAMBOO_ORBIT_CENTER);
        float z = view.y;
        float cx = 0.5 + view.x / (z * 0.55 * aspect);
        float base = horizon - 1.2 / z;
        float unit = 1.2 / z;
        // 世界坐标：x 为相对竹竿根部的横向距离，y 为离地高度。
        vec2 w = vec2((uv.x - cx) * aspect * z * 0.55, (uv.y - base) / unit);
        float height = stalk.z;
        if (w.y < -0.2 || w.y > height + 1.6 || abs(w.x) > 3.0) continue;
        float px = z * 0.55 * aspect / uResolution.x * 1.4;
        float sway = 0.04 * sin(uTime * 0.7 + seed);
        float lean = stalk.w + sway;
        // 竿身：圆柱明暗，节处加重。
        float dx = w.x - lean * w.y;
        float radius = 0.11;
        float inStalk = (1.0 - smoothstep(radius - px, radius + px, abs(dx))) * step(0.0, w.y) * step(w.y, height);
        float segment = 1.05 + 0.15 * bambooHash(seed);
        float node = smoothstep(0.06, 0.0, abs(fract(w.y / segment) - 0.03) * segment) * step(abs(dx), radius * 1.35) * step(w.y, height);
        float stalkWash = inStalk * (0.42 + 0.45 * pow(abs(dx) / radius, 2.0) + 0.12 * valueNoise(vec2(dx * 30.0, w.y * 1.5 + seed)));
        float mask = max(inStalk, node);
        float wash = stalkWash;
        float stroke = node;
        // 竹叶：上半段约一半的节上长一簇，每簇四片，左右交替、向下垂。
        int nodes = int(height / segment);
        for (int j = 2; j < 12; j++) {
            if (j >= nodes) break;
            float h = float(j) * segment;
            if (h < height * 0.4 || bambooHash(seed + float(j)) < 0.45) continue;
            vec2 origin = vec2(lean * h, h);
            vec2 rel = w - origin;
            if (dot(rel, rel) > 3.2) continue;
            float side = bambooHash(seed + float(j) * 1.7) < 0.5 ? -1.0 : 1.0;
            for (int k = 0; k < 4; k++) {
                float spread = (float(k) - 1.5) * 0.32;
                float angle = (side > 0.0 ? 0.0 : 3.14159) - side * (0.35 + spread) + 0.06 * sin(uTime * 0.9 + seed + float(k));
                vec2 dir = vec2(cos(angle), sin(angle));
                vec2 p = vec2(dot(rel, dir), dot(rel, vec2(-dir.y, dir.x)));
                vec2 leaf = leafBlade(p, 1.05 + 0.35 * bambooHash(seed + float(j * 4 + k)), 0.12, px);
                mask = max(mask, leaf.x);
                wash = max(wash, leaf.x * (0.55 + 0.3 * valueNoise(p * 6.0 + seed)));
                stroke = max(stroke, leaf.y * 0.5);
            }
        }
        float near = exp(-z * 0.08);
        float threshold = fbm(uv * 3.0 + seed);
        float shown = smoothstep(threshold - 0.12, threshold + 0.12, uReveal * 1.5 - near * 0.4);
        // 竹根入雾。
        float fog = smoothstep(0.2, 1.4, w.y + 0.6 * fbm(vec2(w.x * 0.8 - uTime * 0.03, seed)));
        float fade = mix(mix(0.15, 0.0, near), 1.0, clearing);
        color = mix(color, uPaper, mask * shown * fog * 0.95);
        float alpha = (wash * mix(0.3, 0.85, near) + stroke * mix(0.3, 0.7, near)) * shown * fog * fade;
        color = mix(color, uInk, clamp(alpha, 0.0, 1.0));
    }
    return color;
}`;
