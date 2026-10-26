/** Resolved legacy topic styles and role themes. */
export interface XmindLegacyStyles {
  /** Style identities mapped to explicit properties. */ readonly properties: ReadonlyMap<string, Record<string, unknown>>;
  /** Theme identities mapped to modern role styles. */ readonly themes: ReadonlyMap<string, Record<string, unknown>>;
}
