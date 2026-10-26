/** 题材与指针墨迹分开失效；静景可无限复用，环境动画跟随每个浏览器帧。 */
export class SceneCache {
    private dirty = true;

    /** 配色、尺寸或宿主视点变化后废弃主体缓存。 */
    invalidate(): void { this.dirty = true; }

    /**
     * @param _now 当前时间（毫秒）。
     * @param ambient 是否播放环境动画。
     * @param moving 是否显影或移动镜头。
     * @returns 是否需要重新绘制题材。
     */
    due(_now: number, ambient: boolean, moving: boolean): boolean {
        return this.dirty || moving || ambient;
    }

    /**
     * @param _now 已提交的题材时间（毫秒）。
     */
    painted(_now: number): void { this.dirty = false; }
}
