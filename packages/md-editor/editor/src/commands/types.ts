/** Host-resolved identity represented by a standard Markdown link. */
export interface MdMention {
  /** Stable host identity, never inferred from a display name. */ readonly id: string;
  /** Human-readable name without the leading @. */ readonly label: string;
  /** Safe profile or application destination stored in Markdown. */ readonly url: string;
  /** Optional secondary text in the picker; not persisted in source. */ readonly description?: string;
}

/** Explicit, cancellable contact search owned by the application. */
export interface MdMentionRequest {
  /** Committed search text. */ readonly query: string;
  /** Aborted on a newer query, close, target invalidation or unmount. */ readonly signal: AbortSignal;
}

/** A host document offered for linking; inserted as a standard Markdown link `[label](url)`. */
export interface MdDocumentLink {
  /** Stable host document identity. */ readonly id: string;
  /** Document title used as the link text. */ readonly label: string;
  /** Safe document destination stored in Markdown. */ readonly url: string;
  /** Optional secondary text in the picker, such as the space; not persisted in source. */ readonly description?: string;
}

/** Host documents offered for linking, and how document links are recognized for presentation. */
export interface MdDocumentLinks {
  /** Static documents or a cancellable search; enables the `[[` trigger and document search in the link dialog. */
  readonly search: MdDocumentLinkSource;
  /** @param url - Link destination. @returns Whether it points to a host document; such links render as document references. */
  readonly recognize?: (url: string) => boolean;
  /**
   * Loads a read-only preview shown when hovering a recognized document link.
   * @param url - Link destination. @param signal - Aborted when the pointer leaves first.
   * @returns The preview, or null to show nothing.
   */
  readonly preview?: (url: string, signal: AbortSignal) => Promise<MdDocumentPreview | null>;
  /** @param url - Recognized document link. @returns The destination written on export, such as an absolute URL; the source is unchanged. */
  readonly exportUrl?: (url: string) => string;
}

/** Read-only preview of a linked document. */
export interface MdDocumentPreview {
    /** Markdown body rendered as prose; hosts should send a bounded excerpt. */ readonly markdown: string;
  /** Footer context such as the last update time. */ readonly description?: string;
}

/** Static documents or a cancellable host search; an empty query asks for suggestions such as recent documents. */
export type MdDocumentLinkSource = readonly MdDocumentLink[] | ((request: MdMentionRequest) => readonly MdDocumentLink[] | Promise<readonly MdDocumentLink[]>);

/** Static contacts or a cancellable host provider. No notifications are sent by the editor. */
export type MdMentionSource = readonly MdMention[] | ((request: MdMentionRequest) => readonly MdMention[] | Promise<readonly MdMention[]>);
