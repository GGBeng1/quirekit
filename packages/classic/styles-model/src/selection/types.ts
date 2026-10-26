import type {
  WordNamedParagraphStyle,
  WordParagraphStyleRegistry
} from "../model";

/** Active paragraph-style selection state. */
export interface WordParagraphStyleSelectionContext {
  /** Active valid document style registry. */
  readonly registry: WordParagraphStyleRegistry;
  /** Uniform effective style identifier, or null for a mixed selection. */
  readonly styleId: string | null;
  /** Uniform style definition, or null for a mixed selection. */
  readonly style: WordNamedParagraphStyle | null;
  /** Whether selected paragraphs use multiple effective style identifiers. */
  readonly mixed: boolean;
  /** Number of selected paragraph-like textblocks. */
  readonly paragraphCount: number;
}
