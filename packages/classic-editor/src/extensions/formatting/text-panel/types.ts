import type { UnderlineStyle } from "@quirekit/extension-underline";
/** Text inspector copy keys, including the native underline style vocabulary. */
export type TextPanelMessage = UnderlineStyle
  | "title" | "fonts" | "eastAsia" | "latin" | "size" | "color" | "automatic" | "mixed" | "highlight" | "noColor"
  | "formatting" | "bold" | "italic" | "strike" | "doubleStrike" | "superscript" | "subscript"
  | "underline" | "underlineColor" | "emphasis" | "dot" | "underDot" | "circle" | "comma"
  | "scale" | "restoreScale" | "scaleDescription"
  | "effects" | "allCaps" | "smallCaps" | "spacing" | "unit" | "outline" | "shadow" | "emboss" | "imprint" | "hidden" | "hiddenDescription";
