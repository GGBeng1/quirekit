/**
 * Lexical material for a space-separated language with inflected thousands.
 */
export type InflectedThousandsLexicon = {
  /** Words for one through nineteen. */
  readonly units: readonly string[];
  /** Words for twenty through ninety by tens. */
  readonly tens: readonly string[];
  /** Words for one hundred through nine hundred. */
  readonly hundreds: readonly string[];
  /** Singular, paucal, and plural thousand forms. */
  readonly thousands: readonly [string, string, string];
  /** Unit forms substituted before singular and paucal thousands. */
  readonly thousandUnits: readonly [string, string];
  /** Whether a standalone one is omitted before one thousand. */
  readonly omitSingleOne: boolean;
  /** Optional special form for four before a thousand noun. */
  readonly thousandFour?: string;
  /** Optional replacement for one hundred when a lower remainder exists. */
  readonly linkedHundred?: string;
};
