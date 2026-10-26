import { backdropGlsl } from '../shared/backdrop';
import { viewGlsl } from '../shared/view';
import { PLUM_BLOSSOMS, PLUM_SEGMENTS } from './layout';

/**
 * 梅：一枝老梅从左上画角横斜而下。枝干按段画出，粗细渐收、边缘墨重、局部飞白；
 * 五瓣梅花只勾花瓣轮廓、点花蕊，并盖住身后的枝；花苞点墨。远处一轮淡月。
 */
export const plumGlsl = /* glsl */ `
${viewGlsl}
${backdropGlsl}
uniform vec4 uSegments[${PLUM_SEGMENTS}];
uniform vec4 uWidths[${PLUM_SEGMENTS / 2}];
uniform vec4 uBlossoms[${PLUM_BLOSSOMS}];
const float PLUM_Z = 10.0;
const float PLUM_ORBIT_CENTER = 14.0;

vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color) {
    // 远山极淡，只作空气。
    color = paintMountains(uv, aspect, clearing, color, 24.0, 0.3);
    // 远处的月：一圈极淡的墨，随视角微动。
    vec2 moonCenter = vec2(0.76 - uAngle * 0.06, 0.74 + (uEye - 1.1) * 0.05);
    float moonDistance = length((uv - moonCenter) * vec2(aspect, 1.0));
    float moon = smoothstep(0.125, 0.12, moonDistance) * 0.025 + smoothstep(0.003, 0.0, abs(moonDistance - 0.122)) * 0.05;
    color = mix(color, uInk, moon * smoothstep(0.3, 0.8, uReveal) * mix(0.4, 1.0, clearing));

    vec2 view = orbitView(vec2(0.0, PLUM_Z), PLUM_ORBIT_CENTER);
    float z = view.y;
    float cx = 0.5 + view.x / (z * 0.55 * aspect);
    float base = 0.2 - (uEye - 1.1) * 0.12;
    float unit = 1.2 / z;
    vec2 w = vec2((uv.x - cx) * aspect * z * 0.55, (uv.y - base) / unit);
    float px = z * 0.55 * aspect / uResolution.x * 1.3;

    // 枝干先合成一个整体轮廓（取各段最近的有符号距离），再统一上墨，接头处不留圈痕。
    float nearest = 1e3;
    float along = 0.0;
    float across = 1.0;
    float which = 0.0;
    for (int i = 0; i < ${PLUM_SEGMENTS}; i++) {
        vec4 seg = uSegments[i];
        vec4 pair = uWidths[i / 2];
        vec2 widths = (i - (i / 2) * 2) == 0 ? pair.xy : pair.zw;
        if (widths.x <= 0.0) continue;
        vec2 a = seg.xy;
        vec2 b = seg.zw;
        vec2 ab = b - a;
        float t = clamp(dot(w - a, ab) / dot(ab, ab), 0.0, 1.0);
        float d = length(w - (a + ab * t));
        float radius = mix(widths.x, widths.y, t);
        float signedDistance = d - radius;
        if (signedDistance < nearest) {
            nearest = signedDistance;
            along = t * length(ab);
            across = d / radius;
            which = float(i);
        }
    }
    float mask = 1.0 - smoothstep(-px, px, nearest);
    // 浓墨写枝，边缘略重；飞白是顺着枝走向拉长的纸白。
    float dry = smoothstep(0.45, 0.75, fbm(vec2(along * 2.2 + which * 1.7, across * 2.5)));
    float ink = mask * (0.72 + 0.2 * across * across) * (1.0 - 0.55 * dry);
    for (int i = 0; i < ${PLUM_BLOSSOMS}; i++) {
        vec4 bloom = uBlossoms[i];
        if (bloom.z <= 0.0) continue;
        vec2 p = w - bloom.xy;
        float r = bloom.z;
        if (dot(p, p) > r * r * 2.6) continue;
        if (bloom.w < 0.5) {
            // 花苞：一点浓墨。
            float bud = 1.0 - smoothstep(r * 0.42 - px, r * 0.42 + px, length(p * vec2(1.0, 0.8)));
            mask = max(mask, bud);
            ink = max(ink, bud * 0.85);
            continue;
        }
        // 开花：五片圆瓣，只勾轮廓，瓣内留白盖住身后的枝；花心点蕊。
        float petals = 0.0;
        float outline = 0.0;
        float rotation = float(i) * 0.9;
        for (int k = 0; k < 5; k++) {
            float angle = rotation + float(k) * 1.2566;
            vec2 c = vec2(cos(angle), sin(angle)) * r * 0.55;
            float dp = length(p - c) - r * 0.5;
            petals = max(petals, 1.0 - smoothstep(-px, px, dp));
            outline = max(outline, smoothstep(px * 2.2, 0.0, abs(dp)));
        }
        float heart = length(p);
        float stamens = smoothstep(px * 2.5, 0.0, abs(heart - r * 0.26)) * step(0.5, valueNoise(vec2(atan(p.y, p.x) * 6.0, float(i))));
        float pistil = 1.0 - smoothstep(r * 0.1 - px, r * 0.1 + px, heart);
        float bloomInk = max(outline * 0.75, max(stamens * 0.8, pistil * 0.9));
        ink = mix(ink, bloomInk, petals);
        mask = max(mask, petals);
    }
    float threshold = fbm(uv * 3.0 + 9.0);
    float shown = smoothstep(threshold - 0.12, threshold + 0.12, uReveal * 1.4);
    float fade = mix(0.15, 1.0, clearing);
    color = mix(color, uPaper, mask * shown * 0.95);
    color = mix(color, uInk, clamp(ink * shown * fade * 0.9, 0.0, 1.0));
    return color;
}`;
