import type {
  WordNamedParagraphStyle,
  WordParagraphStyleRegistry
} from "../model";

/** Options for applying one named paragraph style to the active selection. */
export interface ApplyWordParagraphStyleOptions {
  /** Existing style identifier from the active document registry. */
  readonly styleId: string;
}

/** Options for replacing the complete document paragraph style registry. */
export interface SetWordParagraphStyleRegistryOptions {
  /** Valid complete document paragraph style registry. */
  readonly registry: WordParagraphStyleRegistry;
}

/** Options for replacing one existing document paragraph style definition. */
export interface UpdateWordParagraphStyleOptions {
  /** Complete replacement definition retaining the target style's stable id. */
  readonly style: WordNamedParagraphStyle;
}
