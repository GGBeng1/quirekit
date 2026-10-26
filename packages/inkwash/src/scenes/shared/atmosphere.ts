/**
 * 共用氛围笔法：远山淡影与流动雾带。题材用它们把主体放进同一种空气里——
 * 远处淡、近处浓，层与层之间有雾隔开。写法沿用山水题材的渲染、皴擦与入雾。
 * 依赖合成管线提供的 `uTime`、`uReveal`、`uPaper`、`uInk` 与噪声函数。
 */
export const atmosphereGlsl = /* glsl */ `
// 一层远山的墨量：轮廓由分形噪声起伏，山顶墨重向下渐淡，带竖向皴擦，从山脚入雾。
// baseY 为山脚在屏幕上的高度，height 为最高峰高出山脚的量，ink 为这一层的整体墨量。
float distantRidge(vec2 uv, float aspect, float baseY, float height, float freq, float seed, float ink) {
    float crest = baseY + height * pow(fbm(vec2(uv.x * aspect * freq + seed, seed * 1.7)), 1.8) * 1.6;
    float depth = crest - uv.y;
    if (depth < -0.003) return 0.0;
    float inside = smoothstep(-0.0015, 0.0015, depth);
    float wash = exp(-depth / max(height, 0.01) * 3.5) * 0.85 + 0.1;
    wash *= 0.5 + fbm(vec2(uv.x * aspect * 36.0, uv.y * 6.0) + seed);
    float mistLine = baseY + height * (0.25 + 0.3 * fbm(vec2(uv.x * aspect * 2.2 - uTime * 0.01, seed)));
    float mist = smoothstep(mistLine - height * 0.25, mistLine + height * 0.2, uv.y);
    float threshold = fbm(uv * 3.0 + seed);
    float shown = smoothstep(threshold - 0.12, threshold + 0.12, uReveal * 1.5);
    return clamp(inside * wash * mist * shown * ink, 0.0, 1.0);
}

// 一道流动的雾带：在 y 附近把画面压回纸色，边缘由噪声撕开、缓慢横向流动。
vec3 mistBand(vec3 color, vec2 uv, float aspect, float y, float thickness, float seed, float strength) {
    float band = exp(-pow((uv.y - y) / thickness, 2.0));
    float drift = fbm(vec2(uv.x * aspect * 1.3 - uTime * 0.018 + seed, (uv.y - y) / thickness * 0.6 + seed));
    float veil = band * smoothstep(0.25, 0.75, drift);
    return mix(color, uPaper, clamp(veil * strength, 0.0, 1.0));
}
`;
