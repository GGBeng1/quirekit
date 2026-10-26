/**
 * 宫城的地面投影与院落构件：宫墙、廊庑、三台、广场铺地与金水河。
 *
 * 世界坐标：x 横向、z 纵深、h 离地高度，单位一致。视点绕院落中心环转后按 `z` 透视：
 * 视点高（俯视，界画的惯用视角），地面点落在 `地平线 - CAMERA_HEIGHT / z`，每个世界单位在屏幕上约为 `1.82 / z` 个画面高度（横向已乘宽高比）。
 * 沿地面直线的构件（墙、廊、台基）投影后仍是直线，按屏幕横坐标插值，再用 1/z 做透视校正求沿线距离。
 * 依赖 `viewGlsl` 的 `orbitView` 与楼阁笔法中的 `rule`。
 */
export const gardenGlsl = /* glsl */ `
const float ORBIT_CENTER = 30.0;
const float CAMERA_HEIGHT = 5.0;

// 地平线高度：视点抬高时整座院落下沉。
float gardenHorizon() {
    return 0.7 - (uEye - 1.1) * 0.12;
}

// 地面点 world（x, z）离地 h 处投影到屏幕：xy 为乘过宽高比的屏幕坐标，z 为离视点的距离。
vec3 gardenProject(vec2 world, float h, float aspect) {
    vec2 view = orbitView(world, ORBIT_CENTER);
    float z = max(view.y, 0.5);
    return vec3(0.5 * aspect + view.x / (z * 0.55), gardenHorizon() - CAMERA_HEIGHT / z + h * 1.82 / z, z);
}

// 当前像素落在地面上的世界坐标（x, z）；在地平线以上时 z 为负。
vec2 groundAt(vec2 uv, float aspect) {
    float horizon = gardenHorizon();
    if (uv.y >= horizon - 0.002) return vec2(0.0, -1.0);
    float zv = CAMERA_HEIGHT / (horizon - uv.y);
    float xv = (uv.x - 0.5) * aspect * 0.55 * zv;
    float c = cos(uAngle);
    float s = sin(uAngle);
    float back = zv - ORBIT_CENTER;
    return vec2(xv * c + back * s, -xv * s + back * c + ORBIT_CENTER + uTravel);
}

// 沿地面线段 a→b 的构件在当前像素处的局部坐标：x 为沿线距离，y 为离地高度，z 为远近；不在线段范围内时 z 为负。
vec3 segmentLocal(vec2 uv, vec2 a, vec2 b, float aspect) {
    vec3 pa = gardenProject(a, 0.0, aspect);
    vec3 pb = gardenProject(b, 0.0, aspect);
    float span = pb.x - pa.x;
    if (abs(span) < 1e-4) return vec3(0.0, 0.0, -1.0);
    float t = (uv.x * aspect - pa.x) / span;
    if (t < 0.0 || t > 1.0) return vec3(0.0, 0.0, -1.0);
    float w = mix(1.0 / pa.z, 1.0 / pb.z, t);
    float z = 1.0 / w;
    float along = t / pb.z / w * length(b - a);
    float h = (uv.y - mix(pa.y, pb.y, t)) * z / 1.82;
    return vec3(along, h, z);
}

// 叠墨：先用纸色盖住 mask 遮挡身后，再按远近浓淡上渲染与勾线；远处先显影，标题留白处压淡。
vec3 gardenInk(vec3 color, vec2 uv, float clearing, float z, float seed, float mask, float wash, float stroke) {
    // 穿行时镜头经过的构件化作雾气淡出，不贴脸放大。
    float pass = smoothstep(4.0, 10.0, z);
    mask *= pass; wash *= pass; stroke *= pass;
    float near = exp(-z * 0.07);
    float threshold = fbm(uv * 3.0 + seed);
    float shown = smoothstep(threshold - 0.12, threshold + 0.12, uReveal * 1.5 - near * 0.4);
    color = mix(color, uPaper, clamp(mask, 0.0, 1.0) * shown * 0.95);
    float alpha = (wash * mix(0.22, 0.6, near) + stroke * mix(0.35, 0.92, near)) * shown;
    return mix(color, uInk, clamp(alpha * mix(mix(0.15, 0.0, near), 1.0, clearing), 0.0, 1.0));
}

// 宫墙：淡墨墙身，墙头一道瓦檐，檐下一线阴影。
vec3 paintWall(vec3 color, vec2 uv, float aspect, float clearing, vec2 a, vec2 b, float seed) {
    vec3 l = segmentLocal(uv, a, b, aspect);
    float height = 1.5;
    float cap = 0.3;
    if (l.z <= 0.0 || l.y < -0.05 || l.y > height + cap + 0.05) return color;
    float px = l.z / (1.82 * uResolution.y);
    float h = l.y;
    float body = smoothstep(-px, px, h) * (1.0 - smoothstep(height - px, height + px, h));
    float coping = smoothstep(height - px, height + px, h) * (1.0 - smoothstep(height + cap - px, height + cap + px, h));
    float tiles = smoothstep(0.3, 0.7, abs(fract(l.x / 0.16) - 0.5) * 2.0);
    float shade = smoothstep(height - 0.16, height, h) * body;
    float wash = body * (0.1 + 0.1 * fbm(vec2(l.x * 2.0, h * 6.0) + seed)) + shade * 0.25 + coping * (0.35 + 0.12 * tiles);
    float stroke = rule(h, px * 1.2, seed, l.x) + rule(h - height, px * 1.5, seed + 1.0, l.x) + rule(h - height - cap, px * 1.3, seed + 2.0, l.x);
    return gardenInk(color, uv, clearing, l.z, seed, max(body, coping), wash, min(stroke, 1.0));
}

// 廊庑：台基、等距廊柱、柱间栏杆与一道廊顶；柱间通透，能看见身后的景物。
vec3 paintGallery(vec3 color, vec2 uv, float aspect, float clearing, vec2 a, vec2 b, float seed) {
    vec3 l = segmentLocal(uv, a, b, aspect);
    float height = 1.0;
    float roofHeight = 0.38;
    if (l.z <= 0.0 || l.y < -0.05 || l.y > height + roofHeight + 0.05) return color;
    float px = l.z / (1.82 * uResolution.y);
    float h = l.y;
    float bay = 1.25;
    float toColumn = abs(fract(l.x / bay + 0.5) - 0.5) * bay;
    float column = (1.0 - smoothstep(0.05 - px, 0.05 + px, toColumn)) * step(0.0, h) * step(h, height);
    float platform = smoothstep(-px, px, h) * (1.0 - smoothstep(0.12 - px, 0.12 + px, h));
    float roof = smoothstep(height - px, height + px, h) * (1.0 - smoothstep(height + roofHeight - px, height + roofHeight + px, h));
    float tiles = smoothstep(0.3, 0.7, abs(fract(l.x / 0.14) - 0.5) * 2.0);
    float slope = clamp((h - height) / roofHeight, 0.0, 1.0);
    float inBay = step(0.12, h) * step(h, height);
    float rail = rule(h - 0.42, px * 1.1, seed + 3.0, l.x) * inBay;
    float baluster = rule(abs(fract(l.x / 0.18) - 0.5) * 0.18, px, seed + 4.0, h) * step(0.12, h) * step(h, 0.42) * 0.5;
    float wash = column * 0.5 + platform * 0.2 + roof * (0.38 + 0.12 * tiles) * (0.7 + 0.3 * slope);
    float stroke = rule(h - 0.12, px * 1.2, seed, l.x) + rule(h - height, px * 1.6, seed + 1.0, l.x)
        + rule(h - height - roofHeight, px * 1.3, seed + 2.0, l.x) + rail + baluster;
    return gardenInk(color, uv, clearing, l.z, seed, max(max(column, roof), platform), wash, min(stroke, 1.0));
}

// 台基正面（三台的一层）：汉白玉台帮几乎留白，顶上一列望柱与扶栏；base 为这一层的底高。
vec3 paintTerrace(vec3 color, vec2 uv, float aspect, float clearing, vec2 a, vec2 b, float base, float height, float seed) {
    vec3 l = segmentLocal(uv, a, b, aspect);
    float h = l.y - base;
    if (l.z <= 0.0 || h < -0.05 || h > height + 0.3) return color;
    float px = l.z / (1.82 * uResolution.y);
    float face = smoothstep(-px, px, h) * (1.0 - smoothstep(height - px, height + px, h));
    float above = h - height;
    float toPost = abs(fract(l.x / 0.45) - 0.5) * 0.45;
    float post = (1.0 - smoothstep(0.03 - px, 0.03 + px, toPost)) * step(0.0, above) * step(above, 0.24);
    float stroke = rule(h, px * 1.3, seed, l.x) + rule(above, px * 1.2, seed + 1.0, l.x) + rule(above - 0.2, px, seed + 2.0, l.x) * 0.8;
    float wash = face * (0.06 + 0.06 * fbm(vec2(l.x * 3.0, h * 8.0) + seed)) + post * 0.55;
    return gardenInk(color, uv, clearing, l.z, seed, max(face, post), wash, min(stroke, 1.0));
}

// 广场铺地：中轴一条御道（两道边线与横向石板缝），两侧稀疏的砖缝随远近渐隐。地面构件，不遮挡身后。
vec3 paintPaving(vec3 color, vec2 uv, float aspect, float clearing, float width, float front, float back, float seed) {
    vec2 g = groundAt(uv, aspect);
    if (g.y < front || g.y > back || abs(g.x) > width) return color;
    float z = CAMERA_HEIGHT / (gardenHorizon() - uv.y);
    float edgeX = abs(g.x) - 1.0;
    float road = 0.6 * rule(edgeX, fwidth(edgeX) * 1.1, seed, g.y);
    float slab = g.y / 2.0;
    float slabs = (1.0 - smoothstep(fwidth(slab) * 0.5, fwidth(slab) * 1.5, abs(fract(slab) - 0.5))) * step(abs(g.x), 1.0) * 0.3;
    float row = g.y / 3.4;
    float bricks = (1.0 - smoothstep(fwidth(row) * 0.5, fwidth(row) * 1.5, abs(fract(row) - 0.5)))
        * smoothstep(0.55, 0.75, valueNoise(vec2(g.x * 0.6, floor(row) + seed))) * step(1.2, abs(g.x)) * 0.35;
    float fade = smoothstep(back, back - 6.0, g.y) * smoothstep(front, front + 2.0, g.y);
    return gardenInk(color, uv, clearing, z, seed, 0.0, 0.0, (road + slabs + bricks) * fade);
}

// 金水河：一道弓形河道横过宫门前，两岸石砌驳岸各一道勾线，河面几笔稀疏水纹。地面构件，不遮挡身后。
// center 为河心的纵深，width 为河宽，bow 为两端向远处弯出的量。
vec3 paintRiver(vec3 color, vec2 uv, float aspect, float clearing, float center, float width, float bow, float seed) {
    vec2 g = groundAt(uv, aspect);
    if (g.y < 0.0) return color;
    float course = g.y - (center + bow * pow(g.x / 10.0, 2.0));
    if (abs(course) > width) return color;
    float z = CAMERA_HEIGHT / (gardenHorizon() - uv.y);
    float bank = abs(course) - width * 0.5;
    float banks = 0.6 * rule(bank, fwidth(bank) * 0.9, seed, g.x * 0.6) + 0.3 * rule(bank - 0.12, fwidth(bank) * 0.8, seed + 1.0, g.x * 0.6);
    float row = course / (width * 0.22) + 0.3 * valueNoise(vec2(g.x * 0.5, seed));
    float ripple = (1.0 - smoothstep(fwidth(row) * 0.5, fwidth(row) * 1.5, abs(fract(row) - 0.5)))
        * smoothstep(0.6, 0.8, valueNoise(vec2(g.x * 1.2 - uTime * 0.05, floor(row) * 5.3 + seed))) * step(abs(course), width * 0.42);
    return gardenInk(color, uv, clearing, z, seed, 0.0, 0.0, banks + ripple * 0.6);
}
`;
