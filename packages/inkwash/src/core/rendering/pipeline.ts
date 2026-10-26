import type { InkSplat, InkView, InkWashOptions, InkWashPalette } from '../../types';
import { InkFluid } from '../fluid';
import { bindTexture, createFullscreenTriangle, createProgram, createTarget, deleteTarget } from '../gl';
import { fullscreenVertex } from '../shaders/common';
import { composeFragment } from '../shaders/compose';
import { subjectFragment } from '../shaders/subject';
import { paperFragment } from '../shaders/paper';
import { canvasSize } from './budget';

/**
 * 创建题材缓存与墨迹合成两个阶段，资源归当前画布所有。
 * @param gl WebGL2 上下文。
 * @param canvas 输出画布。
 * @param options 题材、配色和动态偏好。
 * @returns 绘制管线。
 */
export function createPipeline(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement, options: InkWashOptions) {
    const vao = createFullscreenTriangle(gl);
    const subjectProgram = createProgram(gl, fullscreenVertex, subjectFragment(options.scene.glsl));
    const composite = createProgram(gl, fullscreenVertex, composeFragment());
    const subject = options.scene.create(gl);
    const paper = createProgram(gl, fullscreenVertex, paperFragment);
    let grain = createTarget(gl, 1, 1, 'color');
    const empty = createTarget(gl, 1, 1);
    const fluid = !options.reducedMotion && !options.still ? new InkFluid(gl, vao) : null;
    let texture = createTarget(gl, 1, 1, 'color');
    let palette = options.palette;
    let active = false;
    let inkAge = 0;
    let aspect = 0;
    const clearing = options.clearing ?? { center: [0.5, 0.52], radius: [0.42, 0.46] };

    return {
        /** 是否仍有墨迹需要模拟。 */
        get active(): boolean { return active; },
        /**
         * @param width CSS 宽度。
         * @param height CSS 高度。
         * @param dpr 当前设备像素比。
         * @param scale 题材的自适应采样精度。
         * @returns 尺寸是否改变，需废弃主体缓存。
         */
        resize(width: number, height: number, dpr: number, scale: number): boolean {
            const [w, h] = canvasSize(width, height, dpr, 1, 1920 * 1080);
            const [sw, sh] = canvasSize(width, height, dpr, scale);
            const changed = canvas.width !== w || canvas.height !== h || texture.width !== sw || texture.height !== sh || !aspect;
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
            if (grain.width !== w || grain.height !== h) {
                deleteTarget(gl, grain); grain = createTarget(gl, w, h, 'color');
                gl.useProgram(paper.program); gl.bindVertexArray(vao);
                gl.bindFramebuffer(gl.FRAMEBUFFER, grain.framebuffer); gl.viewport(0, 0, w, h);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
            if (texture.width !== sw || texture.height !== sh) {
                deleteTarget(gl, texture); texture = createTarget(gl, sw, sh, 'color');
            }
            if (Math.abs(aspect - width / height) >= 0.005 || !aspect) {
                aspect = width / height; fluid?.resize(aspect); active = false;
            }
            return changed;
        },
        /** @param next 新配色。 */
        setPalette(next: InkWashPalette): void { palette = next; },
        /**
         * 推进一次有界模拟；无墨时不执行任何模拟 pass。
         * @param elapsed 实际帧间隔（秒）。
         * @param splat 最新合并输入。
         */
        simulate(elapsed: number, splat: InkSplat | null): void {
            if (!fluid) return;
            if (splat) { fluid.splat(splat); active = true; inkAge = 0; }
            if (!active) return;
            inkAge += elapsed;
            if (inkAge >= 20) { fluid.clear(); active = false; return; }
            fluid.step(Math.min(1 / 30, elapsed), elapsed);
        },
        /**
         * 完整重建主体缓存，保留各题材内部遮挡。
         * @param seconds 环境时间（秒）。
         * @param reveal 显影进度。
         * @param view 世界坐标视点。
         */
        paint(seconds: number, reveal: number, view: InkView): void {
            subject.prepare?.(gl, view, seconds);
            const u = subjectProgram.uniforms;
            gl.useProgram(subjectProgram.program);
            subject.bind(gl, subjectProgram, view, 0);
            gl.bindVertexArray(vao); gl.bindFramebuffer(gl.FRAMEBUFFER, texture.framebuffer);
            gl.viewport(0, 0, texture.width, texture.height);
            gl.uniform2f(u.uResolution!, texture.width, texture.height);
            gl.uniform1f(u.uTime!, seconds); gl.uniform1f(u.uReveal!, reveal);
            gl.uniform3f(u.uPaper!, ...palette.paper); gl.uniform3f(u.uInk!, ...palette.ink);
            gl.uniform2f(u.uClearCenter!, ...clearing.center); gl.uniform2f(u.uClearRadius!, ...clearing.radius);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        /** 合成缓存题材与本帧墨迹；水波只改变纹理取样坐标。 */
        present(): void {
            const u = composite.uniforms;
            const dye = fluid?.dye ?? empty;
            gl.useProgram(composite.program); gl.bindVertexArray(vao);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(u.uResolution!, canvas.width, canvas.height);
            gl.uniform3f(u.uInk!, ...palette.ink);
            gl.uniform1i(u.uDye!, bindTexture(gl, dye, 0));
            gl.uniform1i(u.uVelocity!, bindTexture(gl, fluid?.velocityField ?? empty, 1));
            gl.uniform1i(u.uScene!, bindTexture(gl, texture, 2));
            gl.uniform1i(u.uGrain!, bindTexture(gl, grain, 3));
            gl.uniform2f(u.uDyeTexel!, 1 / dye.width, 1 / dye.height);
            gl.uniform1f(u.uDistort!, 0.000018);
            gl.uniform2f(u.uClearCenter!, ...clearing.center); gl.uniform2f(u.uClearRadius!, ...clearing.radius);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        /** 回收本画布持有的管线与缓存。 */
        dispose(): void {
            fluid?.dispose(); subject.dispose(gl); deleteTarget(gl, texture); deleteTarget(gl, empty);
            deleteTarget(gl, grain); gl.deleteProgram(paper.program);
            gl.deleteProgram(subjectProgram.program); gl.deleteProgram(composite.program); gl.deleteVertexArray(vao);
        },
    };
}
