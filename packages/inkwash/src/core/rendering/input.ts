import type { InkSplat } from '../../types';

/** 最新输入槽：不保存事件队列，墨量和速度与鼠标采样率无关。 */
export class InkInput {
    private pending: InkSplat | null = null;

    /**
     * @param splat 归一化画布坐标下的最新指针输入。
     */
    push(splat: InkSplat): void {
        const previous = this.pending;
        this.pending = previous && !previous.burst && !splat.burst ? {
            ...splat,
            dx: Math.max(-1600, Math.min(1600, previous.dx + splat.dx)),
            dy: Math.max(-1600, Math.min(1600, previous.dy + splat.dy)),
            ink: Math.min(0.22, previous.ink + splat.ink),
        } : splat;
    }

    /** @returns 唯一待处理输入，同时清空槽位。 */
    take(): InkSplat | null { const pending = this.pending; this.pending = null; return pending; }
}
