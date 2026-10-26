/** One preserve-order XML element: a single tag key with its child list, plus optional `:@` attributes. */
export type OmmlElement = Readonly<Record<string, unknown>>;

/** One preserve-order XML text node. */
export interface OmmlText {
  /** Text content. */
  readonly "#text": string;
}

/** Any preserve-order XML child. */
export type OmmlNode = OmmlElement | OmmlText;

/** Math run properties carried from enclosing style commands into runs. */
export interface OmmlRunStyle {
  /** `m:sty`: plain, bold, bold-italic or italic. */
  readonly sty?: "p" | "b" | "bi" | "i" | undefined;
  /** `m:scr`: script family such as `double-struck`. */
  readonly scr?: string | undefined;
  /** `m:nor`: normal (non-math) text. */
  readonly nor?: boolean | undefined;
}

/** Result of encoding a formula as Word OMML. */
export interface MathOmmlEncoding {
  /** Preserve-order `m:oMathPara` or `m:oMath` element. */
  readonly element: OmmlElement;
  /** Source constructs Word cannot represent, dropped or approximated in the output. */
  readonly losses: readonly string[];
}
