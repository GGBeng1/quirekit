/** @param seconds - Native or draft playback position. @returns Stable, readable time without non-finite values. */
export function mediaTime(seconds: number): string {
  const value = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(value / 3600), minutes = Math.floor(value / 60) % 60;
  return `${hours ? `${hours}:` : ""}${hours ? String(minutes).padStart(2, "0") : minutes}:${String(value % 60).padStart(2, "0")}`;
}
