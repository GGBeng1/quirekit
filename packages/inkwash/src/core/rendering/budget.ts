/** 背景纹理的工作量独立于显示器的物理分辨率。 */
const MAX_PIXELS = 1280 * 720;
const MAX_EDGE = 2560;

/**
 * 保持宽高比，同时限制总像素与最长边；CSS 负责铺满屏幕。
 * @param width CSS 宽度。
 * @param height CSS 高度。
 * @param dpr 设备像素比。
 * @param scale GPU 降采样系数。
 * @param pixels 总像素上限。
 * @returns 有界的画布宽高。
 */
export function canvasSize(width: number, height: number, dpr: number, scale = 1, pixels = MAX_PIXELS): [number, number] {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    const ratio = Math.min(dpr || 1, 1.5, Math.sqrt(pixels / (w * h)), MAX_EDGE / Math.max(w, h)) * scale;
    return [Math.max(1, Math.floor(w * ratio)), Math.max(1, Math.floor(h * ratio))];
}

/**
 * 非阻塞 GPU 背压：最多一帧在途，禁止装饰背景积压历史帧。
 * @param gl 背景 WebGL2 上下文。
 * @returns 帧提交与清理接口。
 */
export function createFrameGate(gl: WebGL2RenderingContext) {
    let fence: WebGLSync | null = null;
    let last = -Infinity;
    let scale = 1;
    let wasBusy = false;
    return {
        /** 慢 GPU 逐步降低采样密度，最低为初始像素量的四分之一。 */
        get scale(): number { return scale; },
        /**
         * 检查上一帧完成状态，不等待 GPU。
         * @param now 当前时间（毫秒）。
         * @returns 是否可提交新帧。
         */
        ready(now: number): boolean {
            if (!fence) return true;
            const status = gl.clientWaitSync(fence, 0, 0);
            if (status === gl.TIMEOUT_EXPIRED) { wasBusy = true; return false; }
            if (status === gl.WAIT_FAILED) throw new Error('Ink wash GPU fence failed');
            if (wasBusy && now - last > 100) scale = Math.max(0.5, scale * 0.75);
            gl.deleteSync(fence);
            fence = null;
            return true;
        },
        /**
         * 标记本帧的所有绘制命令已提交。
         * @param now 提交时间（毫秒）。
         */
        submitted(now: number): void {
            last = now;
            wasBusy = false;
            fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
            if (!fence) throw new Error('Ink wash GPU fence unavailable');
            gl.flush();
        },
        /** 释放尚未完成的帧同步对象。 */
        dispose(): void {
            if (fence) gl.deleteSync(fence);
            fence = null;
        },
    };
}
