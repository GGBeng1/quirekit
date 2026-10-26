/** Explicit emoji policy; defaults are Unicode text and familiar Markdown shortcodes. */
export interface EmojiOptions {
  /** Host additions or replacements, keyed without surrounding colons. */
  readonly definitions: Readonly<Record<string, string>>;
  /** Whether familiar whitespace-bounded ASCII emoticons are accepted. */
  readonly emoticons: boolean;
}
