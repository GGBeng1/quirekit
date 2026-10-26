import { atmosphereGlsl } from '../shared/atmosphere';
import { viewGlsl } from '../shared/view';
import { gardenGlsl } from './garden';
import { hallGlsl } from './hall';

/** 楼阁数量（与 layout.ts 的 HALLS 一致）。 */
export const HALL_COUNT = 10;

/**
 * 宫城：以界尺勾线仿故宫中轴，高视点俯瞰，按远到近叠墨。最远是一抹景山，北墙两端立角楼；
 * 后宫殿宇与三台上的保和殿、中和殿、太和殿沿中轴层层排开；太和殿前的广场夹在两侧廊庑之间，
 * 留白给前景标题，广场南端一道金水河。拖动时视点绕宫城环转，所有构件按真实远近投影，近处用纸色盖住身后。
 */
export const architectureGlsl = /* glsl */ `
${viewGlsl}
${atmosphereGlsl}
uniform vec4 uHalls[${HALL_COUNT * 2}];
${hallGlsl}
${gardenGlsl}

// 第 i 座楼阁：投影到地面（或台基顶）位置，按转角求正面与侧面，脚下入雾后叠墨。
vec3 paintHall(vec3 color, vec2 uv, float aspect, float clearing, int i) {
    vec4 h = uHalls[i * 2];
    vec4 form = uHalls[i * 2 + 1];
    vec2 view = orbitView(h.xy, ORBIT_CENTER);
    float z = view.y;
    // 穿行时已越过或贴脸的楼阁不再绘制。
    if (z < 3.0) return color;
    float scale = 2.6 / z * form.x;
    float cx = 0.5 + view.x / (z * 0.55 * aspect);
    float by = gardenHorizon() - CAMERA_HEIGHT / z + form.y * 1.82 / z;
    vec2 q = vec2((uv.x - cx) * aspect, uv.y - by) / scale;
    if (abs(q.x) > 2.0 || q.y < -0.05 || q.y > 1.9) return color;
    vec2 turn = orbitFacing(view);
    float px = 1.0 / (uResolution.y * scale);
    vec3 m = hall(q, h.z, h.w, px, turn.x, turn.y);
    float mistLine = 0.04 + 0.1 * fbm(vec2(q.x * 1.5 - uTime * 0.02, h.w));
    float fog = smoothstep(mistLine - 0.06, mistLine + 0.08, q.y);
    return gardenInk(color, uv, clearing, z, h.w, m.z * fog, m.x * fog, m.y * fog);
}

vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color) {
    // 最远：景山一抹淡影，北墙与两侧城墙收住画面，角楼立在墙角。
    float hill = distantRidge(uv, aspect, gardenHorizon() - 0.01, 0.06, 0.9, 41.0, 0.32);
    hill *= exp(-pow((uv.x - 0.5) / 0.3, 2.0));
    color = mix(color, uInk, hill * mix(0.3, 1.0, clearing));
    color = paintWall(color, uv, aspect, clearing, vec2(-19.0, 80.0), vec2(19.0, 80.0), 21.0);
    color = paintWall(color, uv, aspect, clearing, vec2(-19.0, 80.0), vec2(-19.0, 46.0), 22.0);
    color = paintWall(color, uv, aspect, clearing, vec2(19.0, 80.0), vec2(19.0, 46.0), 23.0);
    color = paintHall(color, uv, aspect, clearing, 0);
    color = paintHall(color, uv, aspect, clearing, 1);
    // 后宫：乾清宫与两侧配殿，一道薄雾把它们与前朝隔开。
    color = paintHall(color, uv, aspect, clearing, 2);
    color = paintHall(color, uv, aspect, clearing, 3);
    color = paintHall(color, uv, aspect, clearing, 4);
    color = mistBand(color, uv, aspect, gardenHorizon() - 0.1, 0.012, 5.0, 0.6);
    // 前朝：两侧廊庑的深处一段，三台上的三大殿由远到近，再画三台的三层台帮盖住太和殿脚下。
    color = paintGallery(color, uv, aspect, clearing, vec2(-9.0, 44.0), vec2(-9.0, 25.4), 24.0);
    color = paintGallery(color, uv, aspect, clearing, vec2(9.0, 44.0), vec2(9.0, 25.4), 25.0);
    color = paintHall(color, uv, aspect, clearing, 5);
    color = paintHall(color, uv, aspect, clearing, 6);
    color = paintHall(color, uv, aspect, clearing, 7);
    color = paintTerrace(color, uv, aspect, clearing, vec2(-5.2, 29.0), vec2(5.2, 29.0), 1.0, 0.5, 26.0);
    color = paintTerrace(color, uv, aspect, clearing, vec2(-6.2, 28.2), vec2(6.2, 28.2), 0.5, 0.5, 27.0);
    color = paintTerrace(color, uv, aspect, clearing, vec2(-7.2, 27.4), vec2(7.2, 27.4), 0.0, 0.5, 28.0);
    // 广场：御道与砖缝；两侧廊庑与廊庑上的体仁阁、弘义阁。
    color = paintPaving(color, uv, aspect, clearing, 8.4, 10.6, 27.0, 29.0);
    color = paintHall(color, uv, aspect, clearing, 8);
    color = paintHall(color, uv, aspect, clearing, 9);
    color = paintGallery(color, uv, aspect, clearing, vec2(-9.0, 22.6), vec2(-9.0, 4.0), 31.0);
    color = paintGallery(color, uv, aspect, clearing, vec2(9.0, 22.6), vec2(9.0, 4.0), 32.0);
    // 广场南端一道金水河。
    color = paintRiver(color, uv, aspect, clearing, 9.6, 0.8, 1.4, 35.0);
    return color;
}`;
