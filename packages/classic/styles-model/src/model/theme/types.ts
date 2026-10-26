import type { QuireDocumentFontTheme } from "@quirekit/core";

/** Immutable resources used to resolve bindings without persisting fallback values. */
export interface WordStyleThemeContext {
  /** Current document font roles. */
  readonly fonts: QuireDocumentFontTheme | null;
  /** Theme color slots and their Word aliases, as six-digit RGB values. */
  readonly colors: Readonly<Record<string, string>>;
}
