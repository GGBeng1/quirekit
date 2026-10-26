/** Persisted inline-link field; reference-style links remain explicit source fallback. */
export interface LinkAttributes {
  /** Validated destination URL. */
  readonly url: string;
}

/** Host policy for opening a link from an explicit pointer action. */
export interface LinkOptions {
  /** Overrides opening a safe URL in a new tab; never runs during projection. */
  readonly openLink?: (url: string) => void;
  /**
   * Marks links to host objects, such as documents, for distinct presentation; the source stays an ordinary link.
   * @param url - Safe link destination.
   * @returns A kind written to `data-msfe-reference` with the `msfe-link-reference` class, or null for an ordinary link.
   */
  readonly reference?: (url: string) => string | null;
  /**
   * Rewrites a destination when the document is exported, such as resolving site-relative links to absolute URLs;
   * the editor source is unchanged.
   * @param url - Decoded link destination.
   * @returns The exported destination, or null to keep it.
   */
  readonly exportHref?: (url: string) => string | null;
}

/** Named commands contributed when this feature is installed. */
declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** link feature commands. */
    link: {
    /** @param url - Feature command input. @returns The caller’s result or pending chain. */
    insertLink(url: string): ReturnType;
    };
  }
}

/** Host rule that presents matching plain text as a link without changing the Markdown source. */
export interface TextLinkOptions {
  /** Stable extension id, unique within one editor. */
  readonly id: string;
  /** Candidate text; scanned globally, matches touching letters or digits are ignored. */
  readonly pattern: RegExp;
  /** @param text - One candidate. @returns Safe destination, or null to leave the text plain. */
  readonly href: (text: string) => string | null;
  /**
   * Optional batched existence check; omitted, every candidate is linked.
   * @param texts - Unverified visible candidates.
   * @param signal - Aborted when the editor is destroyed.
   * @returns The candidates that exist.
   */
  readonly verify?: (texts: readonly string[], signal: AbortSignal) => Promise<Iterable<string>>;
  /**
   * Optional hover card for a presented link; the product layer renders it with a shared style.
   * Results are cached per text; failures are not cached.
   * @param text - Linked text.
   * @param signal - Aborted when the pointer leaves before the card opens.
   * @returns Card content, or null to show no card.
   */
  readonly card?: (text: string, signal: AbortSignal) => Promise<TextLinkCard | null>;
  /**
   * Optional reverse mapping so ordinary Markdown links to this rule's destinations also show its card,
   * such as `[see issue](https://issues.example.com/browse/CLOUD-1)`.
   * @param url - Destination of an ordinary link.
   * @returns The candidate text the card is loaded for, or null when the link is not this rule's.
   */
  readonly fromHref?: (url: string) => string | null;
  /** Write matches as standard Markdown links when the document is exported; the editor source is unchanged. */
  readonly exportLinks?: boolean;
}

/** Semantic tone of a card status. */
export type TextLinkTone = "neutral" | "info" | "success" | "warning" | "danger";

/** Plain-text hover card content; never interpreted as HTML. */
export interface TextLinkCard {
  /** Main line, such as an issue summary. */
  readonly title: string;
  /** Small line above the title, such as `CLOUD-15084 · Bug`. */
  readonly subtitle?: string;
  /** Optional longer text, clamped by the renderer. */
  readonly description?: string;
  /** Optional status badge. */
  readonly status?: { readonly label: string; readonly tone?: TextLinkTone };
  /** Optional short facts, such as the assignee. */
  readonly fields?: readonly { readonly label: string; readonly value: string }[];
}
