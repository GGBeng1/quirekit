/** Options shared by semantic superscript and subscript marks. */
export interface ScriptPositionOptions {
  /** HTML attributes added when the mark serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}
