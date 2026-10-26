import type { MathDiagnostic, MathEditorFeedback } from '@quirekit/math';

/** Interface languages of the formula panel. */
export type MathUiLocale = 'zh-CN' | 'en';

/** Interface copy of the formula panel in one language. */
export interface MathUiMessages {
  /** Panel accessible name. */
  readonly panel: string;
  /** Template toolbar accessible name. */
  readonly toolbar: string;
  /** Undo action. */
  readonly undo: string;
  /** Redo action. */
  readonly redo: string;
  /** Usage hint below the formula. */
  readonly hint: string;
  /** Source field label. */
  readonly source: string;
  /** Source section title. */
  readonly sourceOptional: string;
  /** Action that discards a conflicting draft. */
  readonly reload: string;
  /** Cancel action. */
  readonly cancel: string;
  /** Confirm action. */
  readonly confirm: string;
  /** Status when the host source changed under a draft. */
  readonly conflict: string;
  /**
   * Formats a source diagnostic with its position.
   * @param message - Diagnostic text.
   * @param offset - UTF-16 source offset.
   * @returns Status text.
   */
  readonly diagnosticAt: (message: string, offset: number) => string;
  /** Status text for editor feedback codes. */
  readonly feedback: Readonly<Record<MathEditorFeedback, string>>;
  /** Status text for source diagnostic codes; without it the parser's own English message is shown. */
  readonly diagnostics?: Readonly<Record<MathDiagnostic['code'], string>>;
  /** Template search accessible name. */
  readonly searchTemplates: string;
  /** Template search placeholder. */
  readonly searchTemplatesPlaceholder: string;
  /** Category selector label. */
  readonly category: string;
  /** Caption while searching every category. */
  readonly allCategories: string;
  /** Template gallery accessible name. */
  readonly gallery: string;
  /** Command search accessible name. */
  readonly searchCommands: string;
  /** Command search placeholder. */
  readonly searchCommandsPlaceholder: string;
  /** Command gallery accessible name. */
  readonly commands: string;
  /** Empty search result. */
  readonly noMatch: string;
  /** Matrix rows field. */
  readonly rows: string;
  /** Matrix columns field. */
  readonly columns: string;
  /** Matrix rows selector label. */
  readonly rowCount: string;
  /** Matrix columns selector label. */
  readonly columnCount: string;
  /** Matrix preview accessible name. */
  readonly matrixPreview: string;
  /** Returns from matrix size to matrix shapes. */
  readonly matrixBack: string;
  /** Inserts the configured matrix. */
  readonly matrixInsert: string;
  /** Visual input accessible name. */
  readonly input: string;
  /** Accessible name of a formula graphic that cannot be drawn. */
  readonly unrenderable: string;
  /** Live status when the edited formula cannot be drawn. */
  readonly unrenderableInput: string;
}

/** Localized interface copy with the active language. */
export interface MathUiText {
  /** Active language. */
  readonly locale: MathUiLocale;
  /** Interface copy. */
  readonly messages: MathUiMessages;
  /**
   * Names a template, symbol or category in the active language.
   * @param item - Item carrying Chinese and English names.
   * @returns Display name.
   */
  readonly name: (item: { readonly label: string; readonly english?: string | undefined }) => string;
}
