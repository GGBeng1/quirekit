import { atmosphereGlsl } from '../shared/atmosphere';
import { backdropGlsl } from '../shared/backdrop';
import { viewGlsl } from '../shared/view';

/** 江崖数量（与 scene.ts 的 CLIFFS 一致）。 */
export const CLIFF_COUNT = 4;

/**
 * 海水江崖：远山淡影之下是一片淡墨水面，水纹是稀疏、断续的写意波线，随透视在远处自然隐去；
 * 天水之间压一道雾。几根江崖从水中耸起，轮廓嶙峋、带披麻皴，崖腰绕云。按远到近叠墨，江崖遮挡身后。
 */
export const wavesGlsl = /* glsl */ `
${viewGlsl}
${backdropGlsl}
${atmosphereGlsl}
uniform vec4 uCliffs[${CLIFF_COUNT}];
const float WAVE_ORBIT_CENTER = 14.0;

// 视点坐标转回世界坐标（orbitView 的逆变换）。
vec2 worldFromView(vec2 view, float center) {
    float c = cos(uAngle);
    float s = sin(uAngle);
    vec2 rel = vec2(view.x, view.y - center);
    return vec2(rel.x * c + rel.y * s, -rel.x * s + rel.y * c + center);
}

// 写意水纹：每隔一段纵深一条起伏的波线，按噪声断成长短不一的几笔；
// 屏幕上两行波线挨得太近时整体隐去，远处只剩淡墨水面，不会堆成密纹。
float waterStrokes(vec2 world, float z, float horizonGap) {
    float spacing = 1.5;
    float rowF = world.y / spacing + uTime * 0.04;
    float row = floor(rowF);
    // 每笔约一两个波长：笔位与长度随行变化，两端收尖。
    float pieceX = world.x * 0.5 + row * 1.37;
    float piece = floor(pieceX);
    float along = fract(pieceX);
    float keep = step(0.45, fract(sin(piece * 12.9898 + row * 78.233) * 43758.5453));
    float taper = smoothstep(0.0, 0.25, along) * smoothstep(1.0, 0.65, along);
    float wave = 0.5 + 0.22 * sin(world.x * 1.6 + row * 2.3 + uTime * 0.35) + 0.08 * sin(world.x * 3.7 + row * 4.1);
    float offset = (fract(rowF) - wave) * spacing;
    float pixels = abs(offset) * 1.2 / (z * z) * uResolution.y;
    float width = mix(2.6, 0.7, smoothstep(4.0, 30.0, z)) * taper;
    float stroke = smoothstep(width * 1.6 + 0.3, width * 0.25, pixels) * keep * step(0.05, taper);
    float rowGap = spacing * 1.2 / (z * z) * uResolution.y;
    return stroke * smoothstep(9.0, 26.0, rowGap) * smoothstep(0.0, 0.04, horizonGap);
}

vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color) {
    // 海对面的远山。
    color = paintMountains(uv, aspect, clearing, color, 22.0, 0.5);
    float horizon = 0.32 - (uEye - 1.1) * 0.12;
    // 水面：淡墨渐变（近处稍重）加稀疏水纹。
    if (uv.y < horizon) {
        float gap = horizon - uv.y;
        float z = 1.2 / max(gap, 0.0005);
        vec2 view = vec2((uv.x - 0.5) * z * 0.55 * aspect, z);
        vec2 world = worldFromView(view, WAVE_ORBIT_CENTER);
        float threshold = fbm(uv * 3.0 + 4.0);
        float shown = smoothstep(threshold - 0.12, threshold + 0.12, uReveal * 1.5 - exp(-z * 0.05) * 0.4);
        float surface = (0.04 + 0.1 * smoothstep(0.0, 0.35, gap)) * (0.6 + 0.8 * fbm(world * vec2(0.15, 0.5)));
        float strokes = waterStrokes(world, z, gap) * mix(0.3, 0.7, smoothstep(0.0, 0.3, gap));
        color = mix(color, uInk, clamp((surface + strokes) * shown, 0.0, 1.0) * mix(0.35, 1.0, clearing));
    }
    // 天水之间一道雾。
    color = mistBand(color, uv, aspect, horizon, 0.035, 2.0, 0.85);
    // 江崖：远到近，轮廓与纹理都在石柱局部坐标里计算。
    for (int i = 0; i < ${CLIFF_COUNT}; i++) {
        vec4 cliff = uCliffs[i];
        float seed = float(i) * 5.7 + 2.0;
        vec2 view = orbitView(cliff.xy, WAVE_ORBIT_CENTER);
        float z = view.y;
        float cx = 0.5 + view.x / (z * 0.55 * aspect);
        float base = horizon - 1.2 / z;
        vec2 q = vec2((uv.x - cx) * aspect * z * 0.55 / cliff.w, (uv.y - base) * z / (cliff.z * 1.2));
        if (q.y < -0.02 || q.y > 1.15 || abs(q.x) > 0.9) continue;
        // 一个像素在石柱局部坐标中的宽度，用来定勾边粗细。
        float pixel = aspect * z * 0.55 / (cliff.w * uResolution.x);
        // 两侧轮廓各自起伏；上窄下宽，顶部参差。
        float profile = 0.5 * (1.0 - 0.45 * q.y);
        float leftEdge = profile + 0.16 * (fbm(vec2(q.y * 6.0, seed)) - 0.5);
        float rightEdge = profile + 0.16 * (fbm(vec2(q.y * 6.0, seed + 3.0)) - 0.5);
        float halfWidth = q.x < 0.0 ? leftEdge : rightEdge;
        float top = 1.0 - 0.18 * fbm(vec2(q.x * 7.0, seed + 1.0));
        float inside = (1.0 - smoothstep(halfWidth - pixel, halfWidth + pixel, abs(q.x))) * (1.0 - smoothstep(top - pixel * 2.0, top + pixel * 2.0, q.y));
        float edge = clamp(abs(q.x) / max(halfWidth, 0.001), 0.0, 1.0);
        // 披麻皴：竖向拉长的笔触；边缘与顶部墨重，中间透白。
        float hemp = smoothstep(0.58, 0.82, fbm(vec2(q.x * 16.0 + seed, q.y * 2.2)));
        float wash = 0.1 + 0.55 * pow(edge, 3.0) + 0.3 * hemp + 0.2 * smoothstep(0.75, 1.0, q.y / max(top, 0.001));
        float outline = smoothstep(pixel * 2.5, 0.0, abs(abs(q.x) - halfWidth)) * step(q.y, top);
        float near = exp(-z * 0.06);
        float threshold = fbm(uv * 3.0 + seed);
        float shown = smoothstep(threshold - 0.12, threshold + 0.12, uReveal * 1.5 - near * 0.4);
        // 石柱脚下入水：水线附近渐隐。
        float footing = smoothstep(0.0, 0.08, q.y);
        color = mix(color, uPaper, inside * shown * footing * 0.95);
        float alpha = (inside * wash * mix(0.5, 0.95, near) + outline * mix(0.45, 0.8, near)) * shown * footing * mix(mix(0.15, 0.0, near), 1.0, clearing);
        color = mix(color, uInk, clamp(alpha, 0.0, 1.0));
        // 崖腰流云。
        float waist = exp(-pow((q.y - 0.5) / 0.12, 2.0));
        float veil = smoothstep(0.3, 0.75, fbm(vec2(q.x * 2.0 - uTime * 0.05, q.y * 4.0 + seed)));
        color = mix(color, uPaper, inside * waist * veil * 0.7);
    }
    return color;
}`;
