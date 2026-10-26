/** Physical insets; page insets use mm, content insets use pt. */
export interface ExportInsets {
  /** Top inset. */ readonly top: number;
  /** Right inset. */ readonly right: number;
  /** Bottom inset. */ readonly bottom: number;
  /** Left inset. */ readonly left: number;
}

/** Explicit script fonts; null retains the selected document theme binding. */
export interface ExportFonts {
  /** Latin font family, or the theme font. */ readonly latin: string | null;
  /** East Asian font family, or the theme font. */ readonly eastAsia: string | null;
  /** Complex-script font family, or the theme font. */ readonly complex: string | null;
  /** Theme family used by null slots. */ readonly theme: 'minor' | 'major';
}

/** A solid border with explicit point units. Null, where accepted, removes a border. */
export interface ExportBorder {
  /** Six-digit RGB without a leading hash. */ readonly color: string;
  /** Stroke thickness in points. */ readonly width: number;
}

/** Text intent, independent of a browser or document encoder. */
export interface ExportTextStyle {
  /** Shared script-font role. */ readonly font: 'body' | 'heading' | 'code' | 'math';
  /** Font size in points. */ readonly size: number;
  /** RGB color, or null for automatic. */ readonly color: string | null;
  /** Bold default; source emphasis remains authoritative. */ readonly bold: boolean;
  /** Italic default. */ readonly italic: boolean;
}

/** Atomic line-height intent; values never mix multiples and points. */
export interface ExportLineHeight {
  /** Multiple of the normal line or an exact point height. */ readonly kind: 'multiple' | 'exact';
  /** Positive multiplier or point value according to kind. */ readonly value: number;
}

/** Paragraph role. All lengths except line multiples use points. */
export interface ExportParagraphStyle {
  /** Default text appearance. */ readonly text: ExportTextStyle;
  /** Space before. */ readonly before: number;
  /** Space after. */ readonly after: number;
  /** Atomic line-height group. */ readonly lineHeight: ExportLineHeight;
  /** Logical alignment in the first, left-to-right template schema. */ readonly align: 'left' | 'center' | 'right' | 'justify';
  /** First-line indentation, independent of content padding. */ readonly firstLine: number;
  /** Keep this paragraph with the next paragraph. */ readonly keepNext: boolean;
  /** Bottom decoration, or null for none. */ readonly border: ExportBorder | null;
  /** Space between text and its bottom border. */ readonly borderSpace: number;
}

/** Shaded block with editable content. */
export interface ExportBlockStyle {
  /** Paragraph formatting inside the block. */ readonly paragraph: ExportParagraphStyle;
  /** Background RGB, or null for none. */ readonly fill: string | null;
  /** Outline, or null for none. */ readonly border: ExportBorder | null;
  /** Uniform inner padding in points. */ readonly padding: number;
}

/** Native header/footer line; supported placeholders are title, page and pages. */
export interface ExportStoryStyle {
  /** Whether this story is emitted. */ readonly enabled: boolean;
  /** Left column literal text and {title}/{page}/{pages} variables. */ readonly left: string;
  /** Center column literal text and variables. */ readonly center: string;
  /** Right column literal text and variables. */ readonly right: string;
  /** Story text style. */ readonly text: ExportTextStyle;
  /** Optional horizontal rule. */ readonly border: ExportBorder | null;
}

/** Complete, serializable export appearance. No content, scripts, CSS, XML or licensing tokens. */
export interface ExportTemplateStyle {
  /** Schema version independent of a library entry's immutable revision. */ readonly schemaVersion: 1;
  /** Paper geometry in millimetres. */ readonly page: {
    /** Portrait paper width before orientation. */ readonly width: number;
    /** Portrait paper height before orientation. */ readonly height: number;
    /** Physical orientation. */ readonly orientation: 'portrait' | 'landscape';
    /** Body margins in millimetres. */ readonly margins: ExportInsets;
    /** Header distance from the sheet edge, in millimetres. */ readonly headerDistance: number;
    /** Footer distance from the sheet edge, in millimetres. */ readonly footerDistance: number;
  };
  /** Font families by semantic role. */ readonly fonts: Readonly<Record<'body' | 'heading' | 'code' | 'math', ExportFonts>>;
  /** Ordinary body paragraphs. */ readonly body: ExportParagraphStyle;
  /** Each heading is independently configurable. */ readonly headings: Readonly<Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', ExportParagraphStyle>>;
  /** List spacing and indentation in points. */ readonly list: {
    /** Item paragraph. */ readonly paragraph: ExportParagraphStyle;
    /** Indentation per nesting level. */ readonly indent: number;
    /** Marker-to-text distance. */ readonly hanging: number;
  };
  /** Editable quoted content. */ readonly quote: ExportBlockStyle;
  /** Literal code blocks. */ readonly code: ExportBlockStyle;
  /** Inline code appearance. */ readonly inlineCode: {
    /** Inline code text. */ readonly text: ExportTextStyle;
    /** Background RGB, or none. */ readonly fill: string | null;
  };
  /** Native table appearance. */ readonly table: {
    /** Cell paragraphs. */ readonly paragraph: ExportParagraphStyle;
    /** Header text. */ readonly headerText: ExportTextStyle;
    /** Header background. */ readonly headerFill: string | null;
    /** All visible cell borders. */ readonly border: ExportBorder | null;
    /** Cell padding in points. */ readonly padding: number;
  };
  /** Built-in semantic container palettes. */ readonly containers: Readonly<Record<'note' | 'tip' | 'warning' | 'caution' | 'danger' | 'details', ExportBlockStyle>>;
  /** Footnote paragraphs. */ readonly footnote: ExportParagraphStyle;
  /** Display equation paragraphs. */ readonly math: ExportParagraphStyle;
  /** Hyperlink color; null retains automatic text color. */ readonly linkColor: string | null;
  /** Horizontal rule appearance. */ readonly rule: ExportBorder | null;
  /** Minimum separation between adjacent framed blocks, in points. */ readonly blockGap: number;
  /** Image geometry and alignment. */ readonly image: {
    /** Maximum width as a percentage of available width. */ readonly maxWidth: number;
    /** Alignment for paragraphs containing only an image. */ readonly align: 'left' | 'center' | 'right';
  };
  /** Default single-section header. */ readonly header: ExportStoryStyle;
  /** Default single-section footer. */ readonly footer: ExportStoryStyle;
}

/** Partial authoring input. Resolution returns a complete, deeply frozen snapshot. */
export type ExportTemplateInput = { readonly [K in keyof ExportTemplateStyle]?: PartialStyle<ExportTemplateStyle[K]> };
/** Recursive optional configuration, with line-height and border groups resolved atomically. */
export type PartialStyle<T> = T extends object ? { readonly [K in keyof T]?: PartialStyle<T[K]> } : T;
