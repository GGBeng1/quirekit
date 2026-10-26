import type { InkWashOptions, InkViewTarget } from '../../types';

const RELEASE_STILL_MS = 80;

/**
 * 管理题材世界坐标中的镜头与拖动惯性。
 * @param options 题材和交互配置。
 * @returns 镜头操作。
 */
export function createCamera(options: InkWashOptions) {
    const orbit = options.scene.orbit;
    // 视点：绕画面主体的环转角与视点高度，拖动改目标值，渲染时平滑逼近。
    const baseEye = options.eye ?? options.scene.defaultEye;
    const view = { angle: 0, eye: baseEye, travel: 0, targetAngle: 0, targetEye: baseEye, targetTravel: 0 };
    // 拖动速度（每秒的环转角与视点高度变化），松手后据此继续滑行并逐渐减速。
    const spin = { angle: 0, eye: 0 };
    let draggedAt = -Infinity;
    let dragging = false;
    /**
     * @param angle 环转角。
     * @returns 限制在环转范围内的角度。
     */
    const clampAngle = (angle: number): number => Math.max(-orbit.angle, Math.min(orbit.angle, angle));
    /**
     * @param eye 视点高度。
     * @returns 限制在升降范围内的高度。
     */
    const clampEye = (eye: number): number => Math.max(baseEye - orbit.eyeBelow, Math.min(baseEye + orbit.eyeAbove, eye));
    /**
     * @param travel 穿行距离。
     * @returns 限制在题材穿行范围内的距离。
     */
    const clampTravel = (travel: number): number => Math.max(0, Math.min(orbit.travel ?? 0, travel));
    return {
        /** 当前世界坐标镜头。 */
        view,
        /** @param dx 横向归一化位移。 @param dy 纵向归一化位移。 */
        drag(dx: number, dy: number): void {
            if (options.orbit !== 'drag') return;
            const now = performance.now();
            const interval = Math.max((now - draggedAt) / 1000, 1 / 120);
            const fresh = !dragging;
            dragging = true;
            draggedAt = now;
            const dAngle = -dx * 1.4;
            const dEye = -dy * 2;
            spin.angle = fresh ? 0 : spin.angle + (dAngle / interval - spin.angle) * 0.4;
            spin.eye = fresh ? 0 : spin.eye + (dEye / interval - spin.eye) * 0.4;
            view.targetAngle = clampAngle(view.targetAngle + dAngle);
            view.targetEye = clampEye(view.targetEye + dEye);
        },
        /** 松手时停住或继续既有惯性。 */
        release(): void {
            if (!dragging) return;
            dragging = false;
            // 停住不动再松手不该被甩出去。
            if (performance.now() - draggedAt > RELEASE_STILL_MS) { spin.angle = 0; spin.eye = 0; }
        },
        /** @param target 宿主镜头目标。 @param immediate 是否直接到位。 */
        setView(target: InkViewTarget, immediate: boolean): void {
            if (target.angle !== undefined) view.targetAngle = clampAngle(target.angle);
            if (target.eye !== undefined) view.targetEye = clampEye(target.eye);
            if (target.travel !== undefined) view.targetTravel = clampTravel(target.travel);
            if (immediate) {
                view.angle = view.targetAngle; view.eye = view.targetEye; view.travel = view.targetTravel;
            }
        },
        /**
         * 推进镜头平滑，不将 GPU 掉帧积压成延迟运动。
         * @param elapsed 实际帧间隔（秒）。
         * @returns 镜头是否发生可见变化。
         */
        step(elapsed: number): boolean {
            const before = [view.angle, view.eye, view.travel];
            // 拖动中视角较快地追随指针；松手后按拖动速度惯性滑行、摩擦减速，撞到环转边界即停。
            // 用真实帧间隔计算，掉帧时也不会越拖越慢。
            if (!dragging && (spin.angle !== 0 || spin.eye !== 0)) {
                const angle = clampAngle(view.targetAngle + spin.angle * elapsed);
                const eye = clampEye(view.targetEye + spin.eye * elapsed);
                if (angle === view.targetAngle) spin.angle = 0;
                if (eye === view.targetEye) spin.eye = 0;
                view.targetAngle = angle;
                view.targetEye = eye;
                const friction = Math.exp(-elapsed * 3.5);
                spin.angle = Math.abs(spin.angle * friction) < 1e-3 ? 0 : spin.angle * friction;
                spin.eye = Math.abs(spin.eye * friction) < 1e-3 ? 0 : spin.eye * friction;
            }
            const ease = 1 - Math.exp(-elapsed * (dragging ? 14 : 9));
            view.angle += (view.targetAngle - view.angle) * ease;
            view.eye += (view.targetEye - view.eye) * ease;
            view.travel += (view.targetTravel - view.travel) * (1 - Math.exp(-elapsed * 6));
            const changed = Math.abs(view.angle - before[0]!) + Math.abs(view.eye - before[1]!) + Math.abs(view.travel - before[2]!);
            if (changed < 1e-5 && !dragging && !spin.angle && !spin.eye) {
                view.angle = view.targetAngle; view.eye = view.targetEye; view.travel = view.targetTravel;
                return false;
            }
            return changed > 0;
        },
    };
}
