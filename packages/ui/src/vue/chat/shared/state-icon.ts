/** 为展示状态选择既有公共图标。
 * @param state - 中立展示状态。
 * @returns IconProvider 可解析的图标名。
 */
export function stateIcon(state: string): string {
  if (state === 'running' || state === 'streaming') return 'loaderCircle';
  if (state === 'error' || state === 'failed') return 'circleX';
  if (state === 'stopped' || state === 'cancelled') return 'square';
  if (state === 'complete' || state === 'succeeded') return 'check';
  return 'clock';
}
