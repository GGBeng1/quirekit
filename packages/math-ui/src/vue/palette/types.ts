import type { MathDocument, MathCommandFamily, MathCommand } from '@quirekit/math';

/** Finite formula families shared by category pickers and the toolbar. */
export type FormulaFamily = MathCommandFamily;

/** Shared category toolbar state. */
export interface FormulaToolbarProps {
  /** Suspends all insertions while the host owns the draft. */
  readonly disabled?: boolean;
  /** Whether the draft history can step back. */
  readonly canUndo?: boolean;
  /** Whether the draft history can step forward. */
  readonly canRedo?: boolean;
}

/** Accessible formula command tile with a complete SVG example document. */
export interface FormulaChoiceProps {
  /** Whether keyboard navigation currently targets this command. */
  readonly current?: boolean;
  /** Accessible Chinese command name. */
  readonly label: string;
  /** English hover name. */
  readonly english: string;
  /** Complete admitted example consumed by the shared preview renderer. */
  readonly document: MathDocument;
  /** Whether this already-mounted tile is visible; defaults to true. */
  readonly visible?: boolean;
  /** Whether host state prevents insertion. */
  readonly disabled?: boolean;
  /** Gives complete formula presets a wider preview tile. */
  readonly wide?: boolean;
  /** Uses a compact target for a single Greek or operator glyph. */
  readonly compact?: boolean;
}

/** One admitted command shared by every discovery entrance. */
export interface FormulaCatalogItem extends MathCommand {
  /** UI-owned gallery span for a complete formula preset. */
  readonly wide?: boolean;
}

/** Shared content-driven gallery used by category menus and slash search. */
export interface FormulaGridProps {
  /** Admitted preview choices in navigation order. */
  readonly items: readonly FormulaCatalogItem[];
  /** Accessible task name for the visual group. */
  readonly label: string;
  /** Whether an already-mounted gallery is being presented to the user. */
  readonly visible?: boolean;
  /** Current search-result index; omitted when no result is highlighted. */
  readonly active?: number;
  /** Suspends insertion while the host owns the formula draft. */
  readonly disabled?: boolean;
}

/** A template gallery with a configurable initial family and reusable trigger. */
export interface TemplatePaletteProps {
  /** Accessible trigger name. */
  readonly label: string;
  /** Compact category glyph; full formula previews belong inside the gallery. */
  readonly trigger: string;
  /** Starting family, defaulting to basic. */
  readonly initialGroup?: FormulaFamily;
  /** Suspends insertion while a host operation owns editing. */
  readonly disabled?: boolean;
  /** Whether the trigger shows a disclosure arrow; a "more" glyph already says it opens a menu. */
  readonly indicator?: boolean;
}

/** Bounded matrix setup preview before atomic insertion. */
export interface MatrixPickerProps {
  /** Selected admitted shape identity. */
  readonly value: string;
}
