/**
 * 界画楼阁的笔法与造型：界尺勾线、软边矩形，以及一座楼阁（台基、屋身、一至三重屋顶）在局部坐标中的覆盖。
 * 局部单位约为楼阁半宽；正面按转角压窄，侧面（山面）贴在正面一侧，屋顶跨过两者连成一体。
 */
export const hallGlsl = /* glsl */ `
// 界尺勾线：线心最浓、向两侧渐淡；按噪声局部飞白断笔。
float rule(float d, float width, float seed, float along) {
    float breaks = smoothstep(0.08, 0.26, valueNoise(vec2(along * 9.0, seed)));
    return smoothstep(width * 1.6, width * 0.35, abs(d)) * breaks;
}

// 轴对齐矩形的软边覆盖率。
float box(vec2 p, vec2 lo, vec2 hi, float soft) {
    vec2 inside = smoothstep(lo - soft, lo + soft, p) * (1.0 - smoothstep(hi - soft, hi + soft, p));
    return inside.x * inside.y;
}

// 一座楼阁在局部坐标中的覆盖：x 为渲染浓度，y 为勾线浓度，z 为整体轮廓（用来遮挡身后的楼阁）。
// 局部单位约为楼阁半宽。
// facing 为正面朝向视点的程度（转角余弦），side 为侧面露出的程度与方向（正值在右）。
// 正面按 facing 压窄，侧面（山面）贴在正面一侧，屋顶跨过两者连成一体。
vec3 hall(vec2 q, float tiers, float seed, float px, float facing, float side) {
    float mask = 0.0;
    float wash = 0.0;
    float stroke = 0.0;
    float w = px * 1.15;
    float sideSign = side >= 0.0 ? 1.0 : -1.0;
    // 台基与踏步：随底层屋身的投影宽度伸缩。
    float baseHalf = 0.78;
    float baseSide = baseHalf * 1.2 * abs(side);
    float left = -baseHalf * facing - (sideSign < 0.0 ? baseSide : 0.0);
    float right = baseHalf * facing + (sideSign > 0.0 ? baseSide : 0.0);
    float center = (left + right) * 0.5;
    float halfSpan = (right - left) * 0.5 * 1.47;
    float platform = box(q, vec2(center - halfSpan, 0.0), vec2(center + halfSpan, 0.09), px);
    mask = max(mask, platform);
    wash += 0.32 * platform;
    stroke += rule(q.y - 0.09, w, seed, q.x) * step(abs(q.x - center), halfSpan);
    stroke += rule(q.y, w, seed + 1.0, q.x) * step(abs(q.x - center), halfSpan);
    for (int k = 1; k < 3; k++) {
        float y = 0.03 * float(k);
        stroke += 0.8 * rule(q.y - y, w * 0.8, seed + 2.0, q.x) * step(abs(q.x), (0.24 - 0.04 * float(k)) * facing);
    }
    float base = 0.09;
    for (int t = 0; t < 3; t++) {
        if (float(t) >= tiers) break;
        float s = 1.0 - 0.24 * float(t);
        float bw = 0.78 * s;
        float bh = (t == 0 ? 0.46 : 0.3) * s;
        float frontHalf = bw * facing;
        float sideWidth = bw * 1.2 * abs(side);
        float edge = frontHalf * sideSign;
        float outer = edge + sideWidth * sideSign;
        float l = min(-frontHalf, min(edge, outer));
        float r = max(frontHalf, max(edge, outer));
        float inBody = step(base, q.y) * step(q.y, base + bh);
        // 正面：淡墨墙面、五根柱子、柱间槅扇；侧面背光，墨色稍重，只有两根柱子。
        float front = box(q, vec2(-frontHalf, base), vec2(frontHalf, base + bh), px);
        float flank = box(q, vec2(min(edge, outer), base), vec2(max(edge, outer), base + bh), px);
        mask = max(mask, max(front, flank));
        wash += 0.1 * front + 0.17 * flank;
        for (int k = 0; k < 5; k++) {
            float x = -frontHalf + 2.0 * frontHalf * float(k) / 4.0;
            stroke += rule(q.x - x, w * 1.2, seed + 3.0 + float(k), q.y) * inBody;
        }
        stroke += rule(q.x - outer, w * 1.2, seed + 7.5, q.y) * inBody * step(0.01, sideWidth);
        stroke += 0.8 * rule(q.x - (edge + outer) * 0.5, w, seed + 7.8, q.y) * inBody * step(0.02, sideWidth);
        float lattice = abs(fract(q.x / max(facing, 0.05) * 9.0 / s) - 0.5) * s / 9.0;
        float doors = step(base + bh * 0.3, q.y) * step(q.y, base + bh * 0.88) * step(abs(q.x), frontHalf);
        stroke += 0.35 * rule(lattice * facing, w * 0.55, seed + 8.0, q.y) * doors;
        wash += 0.08 * doors;
        float rail = base + bh * 0.26;
        stroke += 0.7 * rule(q.y - rail, w * 0.8, seed + 9.0, q.x) * step(l - 0.04 * s, q.x) * step(q.x, r + 0.04 * s);
        float baluster = abs(fract(q.x * 14.0 / s) - 0.5) * s / 14.0;
        stroke += 0.45 * rule(baluster, w * 0.6, seed + 10.0, q.y) * step(l, q.x) * step(q.x, r) * step(base, q.y) * step(q.y, rail);
        // 屋顶：正脊平直并随转角缩短，坡面先陡后缓（凹曲面），檐角起翘；侧面上方的坡顶略重。
        float roofCenter = (l + r) * 0.5;
        float halfWidth = (r - l) * 0.5 * 1.38;
        float x = abs(q.x - roofCenter) / halfWidth;
        float ridgeHalf = 0.32 * facing;
        float slope = clamp((x - ridgeHalf) / (1.0 - ridgeHalf), 0.0, 1.0);
        float height = (t == 0 ? 0.34 : 0.3) * s;
        float lift = 0.07 * s * pow(slope, 7.0);
        float eave = base + bh + 0.02 * s;
        float top = eave + height * (1.0 - pow(slope, 0.55)) + lift;
        float bottom = eave + lift * 1.15 - 0.012 * s;
        float roof = step(x, 1.0) * smoothstep(bottom - px, bottom + px, q.y) * (1.0 - smoothstep(top - px, top + px, q.y));
        float tiles = smoothstep(0.25, 0.75, abs(fract((q.x - roofCenter) / halfWidth * 15.0) - 0.5) * 2.0);
        float depth = clamp((q.y - bottom) / max(top - bottom, 0.001), 0.0, 1.0);
        float grain = fbm(vec2(q.x * 22.0, q.y * 5.0) + seed);
        float overSide = step(0.0, (q.x - edge) * sideSign) * step(0.01, sideWidth);
        mask = max(mask, roof);
        wash += roof * (0.36 + 0.08 * tiles + 0.18 * grain + 0.1 * overSide) * (0.7 + 0.3 * depth);
        stroke += rule(q.y - bottom, w * 1.5, seed + 11.0, q.x) * step(x, 1.0);
        stroke += 0.8 * rule(q.y - top, w * 1.2, seed + 12.0, q.x) * step(x, 1.0) * step(ridgeHalf, x);
        stroke += rule(q.y - (eave + height), w * 2.2, seed + 13.0, q.x) * step(x, ridgeHalf);
        float hook = rule(abs(q.x - roofCenter) - halfWidth * ridgeHalf, w * 1.6, seed + 14.0, q.y);
        stroke += hook * step(eave + height, q.y) * step(q.y, eave + height + 0.06 * s);
        base = eave + height * 0.72;
    }
    return vec3(min(wash, 1.0), min(stroke, 1.0), mask);
}
`;
