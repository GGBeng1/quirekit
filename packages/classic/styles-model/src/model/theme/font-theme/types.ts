/** One XML element start tag with namespace-local names. */
export interface OoxmlXmlElement {
  /** Namespace-local element name. */
  readonly localName: string;
  /** Namespace-local attributes decoded from XML entities. */
  readonly attributes: Readonly<Record<string, string>>;
  /** Open ancestor elements from outermost to innermost. */
  readonly ancestors: readonly OoxmlXmlElementFrame[];
}

/** Lightweight open-element frame retained by the XML scanner. */
export interface OoxmlXmlElementFrame {
  /** Namespace-local element name. */
  readonly localName: string;
  /** Namespace-local attributes decoded from XML entities. */
  readonly attributes: Readonly<Record<string, string>>;
}

/** One resolved major or minor DrawingML font set. */
export interface OoxmlThemeFontSet {
  /** Direct Latin theme family. */
  readonly latin?: string | undefined;
  /** Direct East Asian theme family. */
  readonly eastAsia?: string | undefined;
  /** Direct complex-script theme family. */
  readonly complexScript?: string | undefined;
  /** Script-code-specific supplemental families. */
  readonly supplemental: ReadonlyMap<string, string>;
}

/** Major and minor font roles parsed from one DrawingML theme. */
export interface OoxmlThemeFontScheme {
  /** Major role normally used by headings. */
  readonly major?: OoxmlThemeFontSet | undefined;
  /** Minor role normally used by body text. */
  readonly minor?: OoxmlThemeFontSet | undefined;
}

/** Theme language hints parsed from Word settings. */
export interface OoxmlThemeFontLanguages {
  /** Latin theme language. */
  readonly latin?: string | undefined;
  /** East Asian theme language. */
  readonly eastAsia?: string | undefined;
  /** Bidirectional/complex-script theme language. */
  readonly bidi?: string | undefined;
}
