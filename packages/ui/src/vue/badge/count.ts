/**
 * Formats a nonnegative integer count while preserving its full readable value.
 * @param count - Host count, including zero.
 * @param max - Largest count displayed in full.
 * @returns Compact visual text and uncapped accessible text.
 */
export function badgeCount(count: number, max: number) {
  const value = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const cap = Number.isFinite(max) ? Math.max(1, Math.floor(max)) : 99;
  return { visual: value > cap ? `${cap}+` : String(value), accessible: String(value) };
}
