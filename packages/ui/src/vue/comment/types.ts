/** Display identity of a comment author. */
export interface QuireKitCommentAuthor {
  /** Display name; also the source of the avatar initials. */
  readonly name: string;
  /** Optional avatar image URL. */
  readonly avatar?: string | undefined;
  /** Short label shown after the name, such as "AI" for an assistant. */
  readonly badge?: string | undefined;
}

/** A person who can be mentioned; inserted as the portable link `[@label](<url>)`. */
export interface QuireKitCommentMention {
  /** Stable host identity. */
  readonly id: string;
  /** Display name without the leading @. */
  readonly label: string;
  /** Destination written in the link. */
  readonly url: string;
  /** Secondary text in the suggestion list. */
  readonly description?: string | undefined;
}

/** Static people, or a lookup by the text typed after @. */
export type QuireKitCommentMentionSource = readonly QuireKitCommentMention[]
  | ((query: string) => readonly QuireKitCommentMention[] | Promise<readonly QuireKitCommentMention[]>);

/** One message as the thread presents it; the first message is the thread root. */
export interface QuireKitCommentMessage {
  /** Stable identity within the thread. */
  readonly id: string;
  /** Message author. */
  readonly author: QuireKitCommentAuthor;
  /** ISO 8601 time, shown compactly with the full value as a tooltip. */
  readonly time: string;
  /** Message text; render formatted content through the `body` slot. */
  readonly body: string;
  /** Whether the message was edited after posting. */
  readonly edited?: boolean | undefined;
  /** Whether the current user may edit this message. */
  readonly editable?: boolean | undefined;
  /** Whether the current user may delete this message; deleting the root deletes the thread. */
  readonly deletable?: boolean | undefined;
  /** Mentions in `body`, kept when the message is edited. */
  readonly mentions?: readonly QuireKitCommentMention[] | undefined;
}

/** Where the quoted text stands in the document. */
export type QuireKitCommentQuoteState = "text" | "point" | "deleted" | "unavailable" | "none";

/** Card in a margin rail, or a flat row in a list such as comments on a whole document. */
export type QuireKitCommentVariant = "card" | "plain";

/** CommentThread properties. */
export interface QuireKitCommentThreadProps {
  /** Messages in order; the first is the root. */
  readonly messages: readonly QuireKitCommentMessage[];
  /** Commented text. */
  readonly quote?: string | undefined;
  /** `point` for a position without text, `deleted` / `unavailable` when the text is gone, `none` to show no quote line. Defaults to `text`. */
  readonly quoteState?: QuireKitCommentQuoteState | undefined;
  /** `plain` drops the card frame: a flat row that highlights on hover. Defaults to `card`. */
  readonly variant?: QuireKitCommentVariant | undefined;
  /** Replaces the built-in label shown for `point`, `deleted` and `unavailable`, e.g. to match product wording. */
  readonly quoteLabel?: string | undefined;
  /** Whether the discussion is closed. */
  readonly resolved?: boolean | undefined;
  /** Whether this thread is focused; expands replies and the reply field. */
  readonly active?: boolean | undefined;
  /** Whether to offer resolve / reopen. */
  readonly resolvable?: boolean | undefined;
  /** Whether to offer the reply field. */
  readonly replyable?: boolean | undefined;
  /** Disables actions while a change is being saved. */
  readonly busy?: boolean | undefined;
  /** People offered after typing @ in the reply and edit fields. */
  readonly mentions?: QuireKitCommentMentionSource | undefined;
  /** 1-based place among the threads a reader steps through; the active card then shows previous / next buttons. */
  readonly position?: QuireKitCommentPosition | undefined;
}

/** A thread's place in the sequence a reader steps through. */
export interface QuireKitCommentPosition {
  /** 1-based index of this thread. */
  readonly index: number;
  /** Number of threads in the sequence. */
  readonly total: number;
}

/** CommentDraft properties. */
export interface QuireKitCommentDraftProps {
  /** Text the new comment will refer to. */
  readonly quote?: string | undefined;
  /** Author shown on the draft. */
  readonly author?: QuireKitCommentAuthor | undefined;
  /** Disables submission while saving. */
  readonly busy?: boolean | undefined;
  /** `plain` is a bare input that stays in place, e.g. under a list of comments; actions appear once text is typed. Defaults to `card`. */
  readonly variant?: QuireKitCommentVariant | undefined;
  /** Replaces the built-in placeholder. */
  readonly placeholder?: string | undefined;
  /** Focuses the field when the draft mounts. Defaults to true. */
  readonly autofocus?: boolean | undefined;
  /** People offered after typing @. */
  readonly mentions?: QuireKitCommentMentionSource | undefined;
}

/** One card position request in a CommentRail. */
export interface QuireKitCommentRailItem {
  /** Stable identity, also the slot key. */
  readonly id: string;
  /** Anchor top relative to the rail origin, in CSS pixels. */
  readonly anchorTop: number;
}

/** CommentRail properties. */
export interface QuireKitCommentRailProps {
  /** Cards in document order. */
  readonly items: readonly QuireKitCommentRailItem[];
  /** Minimum rail height, usually the document height. */
  readonly height?: number | undefined;
  /** Vertical gap between pushed cards. Defaults to 12. */
  readonly gap?: number | undefined;
}
