/**
 * 投影有限、有正跨度的进度范围，避免无效几何传入状态机。
 *
 * @param min - 消费者提供的下界。
 * @param max - 消费者提供的上界。
 * @returns 有效范围；无效输入整体回退为 0..100。
 */
export function normalizeProgressRange(min: number, max: number): { min: number; max: number } {
  const span = max - min;
  return Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(span) && span > 0
    ? { min, max }
    : { min: 0, max: 100 };
}

/**
 * 只规范展示数值，不把范围钳制写回任务状态。
 *
 * @param value - 原始任务数值。
 * @param min - 有效范围下界。
 * @param max - 有效范围上界。
 * @returns 范围内数值；null 或非有限数值表示未知进度。
 */
export function normalizeProgressValue(value: number | null, min: number, max: number): number | null {
  return value === null || !Number.isFinite(value) ? null : Math.min(max, Math.max(min, value));
}
