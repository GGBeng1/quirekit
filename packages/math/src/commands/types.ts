import type { MathDocument } from '../model/types';
import type { MathTemplateGroup } from '../templates/types';

/** Finite semantic families; every UI can present its own category controls. */
export type MathCommandFamily = MathTemplateGroup | 'greek' | 'symbols';

/** Bilingual discovery category, independent of a toolbar implementation. */
export interface MathCommandCategory {
  /** Stable semantic family. */
  readonly value: MathCommandFamily;
  /** Chinese family name. */
  readonly label: string;
  /** English family name. */
  readonly english: string;
  /** Optional compact symbol for a consumer-owned category icon. */
  readonly glyph: string;
}

/** One admitted insertion command with a separately validated illustrative preview. */
export interface MathCommand {
  /** Template identity or literal symbol prefixed with symbol:. */
  readonly value: string;
  /** Chinese human name. */
  readonly label: string;
  /** English human name. */
  readonly english: string;
  /** Search aliases; no UI-specific search state. */
  readonly keywords: readonly string[];
  /** Semantic category. */
  readonly group: MathCommandFamily;
  /** Complete example, independent of the insertion template's empty slots. */
  readonly document: MathDocument;
}
