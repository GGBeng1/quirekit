/** Common semantic fields of a confirmed link or image. */
export interface DestinationContent {
  /** Source label start after the opening link/image marker. */
  readonly labelFrom: number;
  /** Source label end before the closing bracket. */
  readonly labelTo: number;
  /** Decoded URI, still subject to the consumer's resource policy. */
  readonly url: string;
  /** Decoded optional title. */
  readonly title: string;
}

/** Inline destination offsets used for exact field-only patches. */
export interface InlineDestination extends DestinationContent {
  /** Explicit inline syntax owns its fields inside this node. */
  readonly kind: "inline";
  /** Destination content start, excluding optional angle delimiters. */
  readonly urlFrom: number;
  /** Destination content end, excluding optional angle delimiters. */
  readonly urlTo: number;
  /** Whether the original destination used angle delimiters. */
  readonly angled: boolean;
  /** Optional title content start, excluding its original delimiter. */
  readonly titleFrom: number | null;
  /** Optional title content end, excluding its original delimiter. */
  readonly titleTo: number | null;
  /** Position after the URL token, for inserting a missing title without normalizing whitespace. */
  readonly afterUrl: number;
}

/** A usage reads shared semantics, but editing it never silently changes a shared definition. */
export interface ReferenceDestination extends DestinationContent {
  /** Full, collapsed and shortcut references share this source policy. */
  readonly kind: "reference";
  /** Raw matched label, excluding brackets. */
  readonly reference: string;
}

/** Automatic links expose their visible address as the source label. */
export interface AutomaticDestination extends DestinationContent {
  /** Both standard angle and bare GFM automatic links. */
  readonly kind: "autolink";
}

/** Confirmed source form controls reversible field editing. */
export type SourceDestination = InlineDestination | ReferenceDestination | AutomaticDestination;

/** Semantic fields that can be changed at one usage without rewriting other uses. */
export interface DestinationPatch {
  /** New decoded URI. Admission is the feature's responsibility. */
  readonly url?: string;
  /** New plain-text label; omission preserves existing inline markup. */
  readonly label?: string;
  /** New decoded title. */
  readonly title?: string;
}
