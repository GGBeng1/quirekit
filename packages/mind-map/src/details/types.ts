/** Bounded embedded PNG, independent of external asset services. */
export interface MindMapTopicImage {
  /** Self-contained PNG source. */ readonly dataUrl: string;
  /** Display width in unscaled CSS pixels. */ readonly width: number;
  /** Display height in unscaled CSS pixels. */ readonly height: number;
  /** Literal alternative text, retained in fallback exports. */ readonly alt: string;
}

/** Optional content attached to a topic. */
export interface MindMapTopicDetails {
  /** Explicit http, https or mailto address; never navigated automatically. */ readonly link?: string;
  /** Literal plain-text note. */ readonly note?: string;
  /** One portable priority marker. */ readonly marker?: "priority-1" | "priority-2" | "priority-3";
  /** Self-contained image and its display dimensions. */ readonly image?: MindMapTopicImage;
}

/** Explicit updates; null deletes that field and omission leaves it unchanged. */
export type MindMapDetailsPatch = { readonly [Key in keyof MindMapTopicDetails]?: MindMapTopicDetails[Key] | null };

/** Minimal WHATWG URL result shared by supported Node and browser hosts, with no DOM types. */
export interface MindMapParsedUrl {
  /** Lowercase scheme including colon. */ readonly protocol: string;
  /** Parsed host without credentials or port. */ readonly hostname: string;
  /** Embedded user name. */ readonly username: string;
  /** Embedded password. */ readonly password: string;
  /** Parsed path or mail recipient. */ readonly pathname: string;
}
