/** Document-level paragraph compatibility decisions; absence retains producer defaults. */
export interface WordParagraphCompatibility {
  /** Whether Shift+Enter lines must remain naturally spaced under justification. */
  readonly doNotExpandShiftReturn?: boolean | undefined;
}
