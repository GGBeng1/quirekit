/** Optional script-boundary spacing expressed as fractions of the ideograph's em. */
export interface QuireTextAutoSpacing {
  /** Han/Latin-letter boundary ratio; zero or omitted disables it. */
  readonly ideographAlpha?: number | undefined;
  /** Han/ASCII-digit boundary ratio; zero or omitted disables it. */
  readonly ideographNumeric?: number | undefined;
}
