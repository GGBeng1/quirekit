/** 群山数量（与 layout.ts 的 MOUNTAINS 一致）。 */
export const MOUNTAIN_ROWS = 12;

/**
 * 水墨群山合成：轮廓纹理每行是一座山在当前视角下的屏幕轮廓（已按远到近排序）。
 * 逐山叠墨：山脊勾线、渲染（山顶墨重向下渐淡）、皴擦，从各自山脚渐渐入雾；
 * 山后流云压淡更远的山，主峰山腰另压一道云。流体墨迹与纸纹由合成管线统一叠加。
 */
export const mountainsGlsl = /* glsl */ `
uniform highp sampler2D uMountainProfiles;
uniform float uDistance[${MOUNTAIN_ROWS}];
uniform float uPeak[${MOUNTAIN_ROWS}];
uniform float uBase[${MOUNTAIN_ROWS}];
uniform float uSeed[${MOUNTAIN_ROWS}];
uniform int uMainRow;

vec4 profileAt(int row, float x) {
    float columns = float(textureSize(uMountainProfiles, 0).x);
    float position = clamp(x, 0.0, 1.0) * (columns - 1.0);
    int left = int(floor(position));
    return mix(texelFetch(uMountainProfiles, ivec2(left, row), 0),
        texelFetch(uMountainProfiles, ivec2(min(left + 1, int(columns) - 1), row), 0), fract(position));
}

// 画距离在 [nearest, farthest) 内的群山，ink 为整体墨量；题材可分段调用，在远近两段之间插入云雾等。
vec3 paintMountainRange(vec2 uv, float aspect, float clearing, vec3 color, float nearest, float farthest, float ink) {

    for (int row = 0; row < ${MOUNTAIN_ROWS}; row++) {
        float peak = uPeak[row];
        if (peak < 0.0 || uDistance[row] < nearest || uDistance[row] >= farthest) continue;
        float base = uBase[row];
        float seed = uSeed[row] * 11.3 + 2.0;
        float span = max(peak - base, 0.05);
        vec4 profile = profileAt(row, uv.x);
        float silhouette = profile.x;
        float depth = silhouette - uv.y;
        if (depth < -0.004) continue;
        float near = exp(-uDistance[row] * 0.032);
        float inside = smoothstep(-0.0008, 0.0012, depth);
        // 渲染：山脊处墨重、向下渐淡；皴擦：竖向拉长的噪声。
        float wash = exp(-depth / span * 4.5) * 0.8 + 0.12;
        wash *= 0.45 + fbm(vec2(uv.x * aspect * 40.0, uv.y * 7.0) + seed);
        // 勾线：粗细随噪声变化，局部飞白断笔。
        float width = profile.y;
        float stroke = smoothstep(width * 2.0, width * 0.4, depth) * profile.z;
        float mistLine = profile.w;
        float mist = smoothstep(mistLine - span * 0.25, mistLine + span * 0.12, uv.y);
        float alpha = clamp(inside * (wash * mist + stroke * mist), 0.0, 1.0);
        alpha *= mix(0.12, 0.62, near * near);
        // 洇开：远山先显影。
        if (uReveal < 1.0) {
            float threshold = fbm(uv * 3.0 + seed);
            alpha *= smoothstep(threshold - 0.12, threshold + 0.12, uReveal * 1.5 - near * 0.4);
        }
        alpha *= mix(mix(0.15, 0.0, near), 1.0, clearing);
        alpha *= ink;
        color = mix(color, uInk, alpha);
        // 山后流云：压淡这座山之前画上的更远的山与山脚。
        float cloud = smoothstep(0.45, 0.8, fbm(vec2(uv.x * aspect * 1.4 - uTime * 0.015 * (1.0 + near), uv.y * 4.0 + seed)));
        float band = exp(-pow((uv.y - base - span * 0.22) / (span * 0.35 + 0.04), 2.0));
        color = mix(color, uPaper, cloud * band * 0.5);
        // 主峰半山腰的云：只见峰顶，不识全貌。
        if (row == uMainRow) {
            float waist = exp(-pow((uv.y - base - span * 0.45) / (span * 0.16), 2.0));
            float veil = smoothstep(0.3, 0.7, fbm(vec2(uv.x * aspect * 2.0 - uTime * 0.02, uv.y * 6.0)));
            color = mix(color, uPaper, waist * (0.55 + 0.4 * veil));
        }
    }

    return color;
}

// 画群山：nearest 以内的山不画（作远景时去掉近处夹峙的高山），ink 为整体墨量。
vec3 paintMountains(vec2 uv, float aspect, float clearing, vec3 color, float nearest, float ink) {
    return paintMountainRange(uv, aspect, clearing, color, nearest, 1e6, ink);
}`;

/** 山水题材本身：完整画出全部群山。 */
export const mountainsSceneGlsl = /* glsl */ `${mountainsGlsl}
vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color) {
    return paintMountains(uv, aspect, clearing, color, 0.0, 1.0);
}`;
