/** Semantic content container; parsing and trusted content rendering belong to the consumer. */
export interface QuireKitProseProps {
  /** Native container element. Defaults to div; named regions require a suitable accessible label. */
  readonly as?: "div" | "article" | "section";
  /** Block spacing without changing text roles. Defaults to comfortable; compact suits document editors. */
  readonly density?: "comfortable" | "compact";
  /** Table width. Defaults to fill, matching document editors; content hugs cell content. Wide tables scroll inside QuireProseTable in either mode. */
  readonly tableWidth?: "fill" | "content";
  /** Options shared by this article's image gallery; an image's previewOptions can override them. */
  readonly imagePreviewOptions?: QuireKitImagePreviewOptions;
}

/** Native content slots shared by static Prose elements. */
export interface QuireKitProseSlots {
  /** Native children; lists and tables retain their HTML nesting constraints. */
  default?: () => unknown;
}

/** Heading anchor behavior; the renderer owns ID generation and uniqueness. */
export interface QuireKitProseHeadingProps {
  /** Native heading identifier supplied by the consumer or Markdown renderer. */
  readonly id?: string;
  /** Link the heading content to its ID. Defaults to true; disable when content includes links. */
  readonly anchor?: boolean;
}

/** Native anchor contract; application routing belongs to a renderer override. */
export interface QuireKitProseAProps {
  /** Link destination, using the consumer renderer's URL policy. */
  readonly href?: string;
  /** Native browsing-context target. */
  readonly target?: string;
  /** Native relationship tokens. */
  readonly rel?: string;
}

/** Code-fence input retained for native rendering and consumer adapters. */
export interface QuireKitProsePreProps {
  /** Exact source for the fallback code element; the default slot takes precedence. */
  readonly code?: string | undefined;
  /** Optional language metadata, available to the slot without becoming a native attribute. */
  readonly language?: string | null | undefined;
  /** Optional filename, also used as the default accessible name. */
  readonly filename?: string | null | undefined;
  /** Optional line numbers for adapters; native Pre does not highlight lines. */
  readonly highlights?: readonly number[] | undefined;
  /** Optional parser metadata for adapters; native Pre does not interpret it. */
  readonly meta?: string | null | undefined;
}

/** Inline-safe image contract with no figure or div wrapper. */
export interface QuireKitProseImgProps {
  /** Native source URL. */
  readonly src: string;
  /** Alternative text; use an empty string for a decorative image. */
  readonly alt: string;
  /** Intrinsic image width, used to reserve its aspect ratio. */
  readonly width?: string | number;
  /** Intrinsic image height, used to reserve its aspect ratio. */
  readonly height?: string | number;
  /** Browser loading strategy. Defaults to lazy. */
  readonly loading?: "eager" | "lazy";
  /** Browser decoding strategy. Defaults to async. */
  readonly decoding?: "sync" | "async" | "auto";
}

/** Native semantic tags with public Vue Prose replacements. */
export type QuireKitProseTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "a"
  | "strong"
  | "em"
  | "b"
  | "i"
  | "cite"
  | "dfn"
  | "var"
  | "samp"
  | "small"
  | "mark"
  | "del"
  | "s"
  | "ins"
  | "u"
  | "sub"
  | "sup"
  | "abbr"
  | "kbd"
  | "code"
  | "br"
  | "p"
  | "blockquote"
  | "pre"
  | "hr"
  | "ul"
  | "ol"
  | "li"
  | "dl"
  | "dt"
  | "dd"
  | "table"
  | "thead"
  | "tbody"
  | "tfoot"
  | "tr"
  | "th"
  | "td"
  | "caption"
  | "img"
  | "figure"
  | "figcaption";

/** Per-tag renderer overrides; compose with quireProseComponents to retain defaults. */
export type QuireKitProseComponentMap = Readonly<Partial<Record<QuireKitProseTag, import("vue").Component | string>>>;
import type { QuireKitImagePreviewOptions } from "../image-preview/types";
