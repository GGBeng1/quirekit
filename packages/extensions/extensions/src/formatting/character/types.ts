/** Serialized character formatting keyed by schema mark name. */
export type CharacterFormattingSnapshot = Readonly<
  Record<string, Readonly<Record<string, unknown>> | null>
>;
