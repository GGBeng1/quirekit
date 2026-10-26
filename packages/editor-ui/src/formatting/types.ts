/** Font-size preset identity. */
export type EditorFontSizeOptionValue = number | string;
/** Shared named/numeric font-size option. */
export interface EditorFontSizeOption {
 /** Localized caption. */ readonly label: string;
 /** Stable preset identity. */ readonly value: EditorFontSizeOptionValue;
 /** Canonical points. */ readonly points: number;
}
