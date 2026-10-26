import type { WordParagraphStyleRegistry } from "./model";

/** Options for Word named paragraph styles and commands. */
export interface WordStylesOptions {
  /** Textblock node names that receive named Word paragraph styles. */
  readonly types: readonly string[];
}

/** Mutable runtime storage used by document-aware style resolvers. */
export interface WordStylesStorage {
  /** Registry resolved from the active editor document. */
  registry: WordParagraphStyleRegistry;
}
