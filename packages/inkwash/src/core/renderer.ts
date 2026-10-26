import { createPointerInk } from './pointer';
import { createFrameGate } from './rendering/budget';
import { createCamera } from './rendering/camera';
import { SceneCache } from './rendering/cache';
import { InkInput } from './rendering/input';
import { createPipeline } from './rendering/pipeline';
import type { InkWashController, InkWashOptions } from '../types';

const REVEAL_SECONDS = 3.2;

/**
 * 启动水墨背景。所有 GPU 工作只在浏览器帧内提交，事件仅使相应缓存失效。
 * @param canvas CSS 尺寸由宿主布局决定的画布。
 * @param options 题材、配色与动态偏好。
 * @returns 镜头、配色与销毁控制器。
 */
export function createInkWash(canvas: HTMLCanvasElement, options: InkWashOptions): InkWashController {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        throw new Error('WebGL2 float render targets unavailable');
    }
    const gate = createFrameGate(gl);
    const camera = createCamera(options);
    const cache = new SceneCache();
    const input = new InkInput();
    const motion = !options.reducedMotion;
    const ambient = motion && !options.still && options.ambient !== false;
    let pipeline: ReturnType<typeof createPipeline> | null = null;
    let palette = options.palette;
    let frame = 0;
    let last = performance.now();
    let seconds = 0;
    let revealed = !motion;
    let ready = false;
    let disposed = false;
    let visible = true;
    let resizePending = true;
    let dpr = 0;
    let scale = 1;

    /** 只在需要变化时订阅下一帧；不设置固定帧率上限。 */
    function wake(): void {
        if (disposed || frame || document.hidden || !visible) return;
        last = performance.now();
        frame = requestAnimationFrame(tick);
    }

    /** 响应布局或跨显示器的尺寸/像素比变化。 */
    function resize(): void { resizePending = true; wake(); }

    /** 停止帧循环并丢弃不可见期间的历史输入。 */
    function pause(): void {
        cancelAnimationFrame(frame); frame = 0; input.take(); camera.release();
    }

    /** 恢复时从最新尺寸与输入开始，不追赶隐藏期间的动画。 */
    function visibility(): void {
        if (document.hidden || !visible) pause();
        else resize();
    }

    /**
     * 浏览器帧：尺寸 → 镜头/模拟 → 题材缓存 → 合成，最多一帧在 GPU 中执行。
     * @param now 浏览器时间（毫秒）。
     */
    function tick(now: number): void {
        frame = 0;
        if (disposed || document.hidden || !visible) return;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        try {
            if (!gate.ready(now)) { frame = requestAnimationFrame(tick); return; }
            if (!pipeline) { pipeline = createPipeline(gl!, canvas, options); pipeline.setPalette(palette); }
            if (resizePending || dpr !== window.devicePixelRatio || scale !== gate.scale) {
                dpr = window.devicePixelRatio; scale = gate.scale; resizePending = false;
                if (pipeline.resize(width, height, dpr, scale)) cache.invalidate();
            }
            const elapsed = Math.max(0, (now - last) / 1000);
            last = now; seconds += elapsed;
            const moving = camera.step(Math.min(elapsed, 0.1));
            const reveal = motion ? Math.min(1, seconds / REVEAL_SECONDS) : 1;
            pipeline.simulate(elapsed, input.take());
            if (cache.due(now, ambient, moving || !revealed)) {
                pipeline.paint(motion ? (ambient ? seconds : Math.min(seconds, REVEAL_SECONDS)) : 0,
                    1 - (1 - reveal) ** 2, { ...camera.view, aspect: width / height });
                cache.painted(now);
            }
            pipeline.present(); gate.submitted(now);
            revealed = reveal === 1;
            if (!ready) { ready = true; options.onReady?.(); }
            if (ambient || !revealed || moving || pipeline.active) frame = requestAnimationFrame(tick);
        } catch (error) {
            destroy();
            canvas.dispatchEvent(new CustomEvent('inkwasherror', { detail: error }));
        }
    }

    const pointer = !motion || options.still ? null : createPointerInk(canvas, {
        onDrag(dx, dy) { if (visible && !document.hidden) { camera.drag(dx, dy); wake(); } },
        onDragEnd() { camera.release(); },
        onSplat(splat) { if (visible && !document.hidden) { input.push(splat); wake(); } },
    }, options.orbit === 'drag');
    const observer = new ResizeObserver(resize);
    const intersection = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
        visible = entries[0]?.isIntersecting ?? true; visibility();
    });
    observer.observe(canvas); intersection?.observe(canvas);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    canvas.addEventListener('webglcontextlost', destroy);

    /** 回收监听、输入、缓存和 GPU 资源；重复销毁无副作用。 */
    function destroy(): void {
        if (disposed) return;
        disposed = true; pause(); observer.disconnect(); intersection?.disconnect(); pointer?.dispose();
        document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', resize);
        canvas.removeEventListener('webglcontextlost', destroy);
        gate.dispose(); pipeline?.dispose(); gl!.getExtension('WEBGL_lose_context')?.loseContext();
    }
    wake();
    return {
        setView(target) {
            camera.setView(target, !motion || (!!options.still && revealed));
            cache.invalidate(); wake();
        },
        getView() { const { angle, eye, travel } = camera.view; return { angle, eye, travel }; },
        setPalette(next) { palette = next; pipeline?.setPalette(next); cache.invalidate(); wake(); },
        destroy,
    };
}
