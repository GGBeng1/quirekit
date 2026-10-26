/** Shared content-box budget for lightweight anchored surfaces; Ark owns available space. */
export const anchoredSurfaceStyle = Object.freeze({
  maxHeight: "min(60dvh, var(--available-height, calc(100dvh - 16px)))"
});
