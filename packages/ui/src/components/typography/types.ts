import type { QuireKitSemanticTypographyTokens } from "../../theme/types";

/** Supported native text elements; layout and interaction remain host-owned. */
export type QuireKitTypographyElement =
  | "p" | "span" | "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  | "strong" | "b" | "em" | "i" | "cite" | "dfn" | "a"
  | "code" | "pre" | "kbd" | "samp" | "var" | "small"
  | "mark" | "del" | "s" | "ins" | "u" | "sub" | "sup" | "abbr";

/** Existing theme typography roles, independent of the rendered HTML meaning. */
export type QuireKitTypographyVariant = keyof QuireKitSemanticTypographyTokens;

/** Semantic text adapter whose color follows its surrounding content. */
export interface QuireKitTypographyProps {
  /** Native element to render; defaults to a paragraph. */
  readonly as?: QuireKitTypographyElement;
  /** Optional typography role overriding the element's default appearance. */
  readonly variant?: QuireKitTypographyVariant;
  /** Optional Markdown-like surface for as="code"; plain preserves unboxed code text. */
  readonly codeStyle?: "plain" | "inline";
  /** Expansion shown by Tooltip for abbr; native title for other text elements. */
  readonly title?: string | undefined;
}
