import type { InkSceneInstance, ShaderProgram } from '../../types';

/**
 * 视点片段：环转角与视点高度两个 uniform，以及绕场景中心环转后的视点坐标换算。
 * 题材把世界坐标（x 横向、z 纵深）转成视点坐标后再自行透视投影。
 */
export const viewGlsl = /* glsl */ `
uniform float uAngle;
uniform float uEye;
uniform float uTravel;

// 把世界坐标绕纵深 center 处环转到视点坐标：x 为横向，y 为离视点的距离；穿行时整座场景朝视点平移。
vec2 orbitView(vec2 world, float center) {
    float c = cos(uAngle);
    float s = sin(uAngle);
    vec2 rel = vec2(world.x, world.y - uTravel - center);
    return vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c + center);
}

// 视点坐标中一个朝向视点的物体，正面与右侧面各露出多少（转角的余弦与侧向分量）。
vec2 orbitFacing(vec2 view) {
    vec2 toEye = normalize(-view);
    float c = cos(uAngle);
    float s = sin(uAngle);
    return vec2(max(dot(vec2(s, -c), toEye), 0.05), dot(vec2(c, s), toEye));
}
`;

/**
 * 绑定视点 uniform。
 * @param gl WebGL2 上下文。
 * @param program 合成程序。
 * @param angle 环转角：视点绕场景中心转过的角度，与山水题材的相机环转同向。
 * @param eye 视点高度。
 * @param travel 沿纵深穿行的距离。
 */
export function bindView(gl: WebGL2RenderingContext, program: ShaderProgram, angle: number, eye: number, travel = 0): void {
    // 着色器里转的是世界而不是视点，方向与视点相反，所以取负，拖动时画面才跟手。
    gl.uniform1f(program.uniforms.uAngle!, -angle);
    gl.uniform1f(program.uniforms.uEye!, eye);
    // 不声明穿行的题材没有这个 uniform，位置为空时 WebGL 忽略写入。
    gl.uniform1f(program.uniforms.uTravel ?? null, travel);
}

/**
 * 只依赖视点与常量 uniform 的题材实例：每次绘制绑定视点，再交给 `extra` 绑定其余 uniform。
 * @param extra 绑定题材常量 uniform 的回调。
 * @returns 题材实例。
 */
export function viewOnlyInstance(extra?: (gl: WebGL2RenderingContext, program: ShaderProgram) => void): InkSceneInstance {
    return {
        bind(gl, program, view) {
            bindView(gl, program, view.angle, view.eye, view.travel);
            extra?.(gl, program);
        },
        dispose() {},
    };
}
