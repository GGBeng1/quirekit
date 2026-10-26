import type { QuireKitTransferItem, QuireKitTransferSide } from './types';

/** Validate identities and project one side without dropping unknown target keys.
 * @param items - Complete known member data.
 * @param value - Target model, possibly containing unknown or repeated keys.
 * @param side - Side to project.
 * @returns Stable known items in source or target order.
 */
export function transferItems(items: readonly QuireKitTransferItem[], value: readonly string[], side: QuireKitTransferSide): QuireKitTransferItem[] {
  const byValue = new Map<string, QuireKitTransferItem>();
  for (const item of items) {
    if (typeof item.value !== 'string' || !item.value.trim() || byValue.has(item.value)) throw new Error('QuireTransfer items require non-empty, unique values.');
    byValue.set(item.value, item);
  }
  const target = new Set(value);
  return side === 'source' ? items.filter(item => !target.has(item.value))
    : [...target].flatMap(key => { const item = byValue.get(key); return item ? [item] : []; });
}

/** Apply an explicit move using live item locks and stable destination order.
 * @param items - Complete live candidates.
 * @param value - Current target model.
 * @param selected - Requested known keys to move.
 * @param direction - Destination side.
 * @returns Complete target value and the keys accepted by this action.
 */
export function transferMove(items: readonly QuireKitTransferItem[], value: readonly string[], selected: readonly string[], direction: QuireKitTransferSide): { value: string[]; keys: string[] } {
  const requested = new Set(selected);
  const origin = transferItems(items, value, direction === 'target' ? 'source' : 'target');
  const keys = origin.filter(item => !item.disabled && requested.has(item.value)).map(item => item.value);
  const moved = new Set(keys);
  return { value: direction === 'target' ? [...new Set([...value, ...keys])] : [...new Set(value)].filter(key => !moved.has(key)), keys };
}

/** Match local display text without changing the host-owned member data.
 * @param items - One side's complete members.
 * @param query - User's search text.
 * @returns Matching members in their existing order.
 */
export function transferFilter(items: readonly QuireKitTransferItem[], query: string): QuireKitTransferItem[] {
  const needle = query.trim().toLocaleLowerCase();
  return items.filter(item => `${item.label} ${item.description ?? ''}`.toLocaleLowerCase().includes(needle));
}

/** Toggle only enabled visible rows, retaining unrelated temporary selections.
 * @param items - Current filtered candidates.
 * @param selected - Temporary selected rows.
 * @returns The next temporary selection.
 */
export function transferToggleAll(items: readonly QuireKitTransferItem[], selected: readonly string[]): string[] {
  const enabled = items.filter(item => !item.disabled).map(item => item.value);
  const keys = new Set(enabled);
  return enabled.every(key => selected.includes(key)) ? selected.filter(key => !keys.has(key)) : [...new Set([...selected, ...enabled])];
}
