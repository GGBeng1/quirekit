import type { InkSceneInstance, ShaderProgram } from '../../types';
import { createMountains } from '../mountains/scene';
import { mountainsGlsl } from '../mountains/shader';
import { bindView } from './view';

/**
 * 远山背景：复用山水题材的群山渲染，供其他题材先画一层远山再画主体，
 * 让每幅画都有同样的纵深、雾与空气透视。着色器里调用 `paintMountains(…, nearest, ink)`。
 */
export const backdropGlsl = mountainsGlsl;

/**
 * 带远山背景的题材实例：每次绘制先绑定群山轮廓与视点，再交给 `extra` 绑定题材自己的 uniform。
 * @param gl WebGL2 上下文。
 * @param extra 绑定题材常量 uniform 的回调。
 * @returns 题材实例。
 */
export function backdropInstance(gl: WebGL2RenderingContext, extra?: (gl: WebGL2RenderingContext, program: ShaderProgram) => void): InkSceneInstance {
    const hills = createMountains(gl);
    return {
        prepare(context, view, seconds) { hills.prepare?.(context, view, seconds); },
        bind(context, program, view, unit) {
            hills.bind(context, program, view, unit);
            bindView(context, program, view.angle, view.eye, view.travel);
            extra?.(context, program);
        },
        dispose(context) {
            hills.dispose(context);
        },
    };
}
