import type { OFDDestination } from "../document/types";
import type { OFDAttachment } from "../resources";

/** Navigates to a coordinate or view on another page in the same document. */
export interface OFDGotoAction {
  /** Discriminator for an in-document coordinate action. */
  readonly type: "goto";
  /** Target page and optional view coordinates. */
  readonly destination: OFDDestination;
}

/** Navigates to a named document bookmark. */
export interface OFDGotoBookmarkAction {
  /** Discriminator for an in-document bookmark action. */
  readonly type: "goto-bookmark";
  /** Name of a bookmark declared by the same document. */
  readonly bookmark: string;
}

/**
 * Action target permitted when the document itself is opened.
 *
 * The owning `Document/Actions` structure fixes every emitted action to the
 * `DO` event. It deliberately excludes URI, attachment, and media targets
 * from the minimal standalone writer profile.
 */
export type OFDDocumentOpenAction =
  | OFDGotoAction
  | OFDGotoBookmarkAction;

/** Opens an external or relative URI. */
export interface OFDURIAction {
  /** Discriminator for a URI action. */
  readonly type: "uri";
  /** Required target URI. */
  readonly uri: string;
  /** Optional base URI for relative targets. */
  readonly base?: string;
}

/** Opens one attachment declared by the same document. */
export interface OFDGotoAttachmentAction {
  /** Discriminator for an attachment action. */
  readonly type: "goto-attachment";
  /** Target attachment owned by the same document. */
  readonly attachment: OFDAttachment;
  /** Whether a viewer should open the attachment in a new window. */
  readonly newWindow?: boolean;
}

/** One standard OFD action target supported by the standalone writer. */
export type OFDAction =
  | OFDGotoAction
  | OFDGotoBookmarkAction
  | OFDURIAction
  | OFDGotoAttachmentAction;
