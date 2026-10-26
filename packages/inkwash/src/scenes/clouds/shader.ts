import { backdropGlsl } from '../shared/backdrop';
import { viewGlsl } from '../shared/view';

/**
 * 云海：视点抬高，群山沉在画面下半；几道云带横在中上层，缠在远峰的半山腰与峰顶之间。
 * 群山按远近分两段画，云带插在两段之间，于是远峰从云中探出、近山又挡在云前。
 * 云不勾轮廓，以纸白留出成团的云块，只在云块下缘与外侧烘淡墨显出体积；云带断续、缓慢漂移，拖动环转时按远近错开。
 */
export const cloudsGlsl = /* glsl */ `
${viewGlsl}
${backdropGlsl}

// 云的浓度场：以云带中线为轴的钟形分布，乘上扭曲后的分形噪声，得到成团、上下都鼓起的云块。
float cloudDensity(vec2 p, float center, float thickness, float seed) {
    vec2 q = vec2(p.x * 2.4, (p.y - center) / thickness * 0.45);
    q += 0.45 * vec2(fbm(q * 1.3 + seed), fbm(q * 1.3 + seed + 4.7));
    float lobes = fbm(q * 1.6 + seed * 1.9);
    float band = exp(-pow((p.y - center) / thickness, 2.0));
    return band * (0.35 + 1.1 * lobes);
}

// 一道云带：浓度过阈值处以纸白留出云块，边缘被细噪声撕开；云块下缘与云团之间烘淡墨显出体积。
// center 为云带中线高度，thickness 为半厚度，parallax 为环转时的错开量，ink 为烘墨浓度。
vec3 cloudBand(vec3 color, vec2 uv, float aspect, float clearing, float center, float thickness, float parallax, float seed, float ink) {
    if (abs(uv.y - center) > thickness * 2.2) return color;
    vec2 p = vec2(uv.x * aspect - uTime * 0.006 * (0.6 + parallax) - uAngle * parallax, uv.y);
    float density = cloudDensity(p, center, thickness, seed);
    float tear = (fbm(vec2(p.x * 16.0, p.y * 12.0) + seed) - 0.5) * 0.12;
    float body = smoothstep(0.5, 0.62, density + tear);
    float threshold = fbm(uv * 2.6 + seed);
    float shown = smoothstep(threshold - 0.15, threshold + 0.15, uReveal * 1.5 - 0.2);
    color = mix(color, uPaper, body * shown * 0.97);
    // 受光朝上：取上方一点的浓度，若上方更浓，说明此处在某团云的下缘，烘墨。
    float lift = thickness * 0.18;
    float above = cloudDensity(p + vec2(0.0, lift), center, thickness, seed);
    float underside = smoothstep(0.0, 0.25, above - density);
    // 云团轮廓外侧一圈极淡的墨，让云在空白处也能读出形状。
    float halo = smoothstep(0.38, 0.5, density + tear) * (1.0 - body);
    float wash = max(underside * body * 0.9, halo * 0.35) * (0.6 + 0.5 * fbm(vec2(p.x * 8.0, p.y * 5.0) + seed));
    return mix(color, uInk, clamp(wash * ink * mix(0.35, 1.0, clearing) * shown, 0.0, 1.0));
}

vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color) {
    // 远峰：最先画，峰顶探出、半山腰被云带缠住。
    color = paintMountainRange(uv, aspect, clearing, color, 30.0, 1e6, 0.85);
    color = cloudBand(color, uv, aspect, clearing, 0.66, 0.06, 0.2, 3.0, 0.35);
    color = cloudBand(color, uv, aspect, clearing, 0.47, 0.08, 0.35, 11.0, 0.45);
    // 中景群山挡在上面两道云前，自己的山腰再被下一道云带没入。
    color = paintMountainRange(uv, aspect, clearing, color, 15.0, 30.0, 0.9);
    color = cloudBand(color, uv, aspect, clearing, 0.3, 0.09, 0.6, 19.0, 0.55);
    return color;
}`;
