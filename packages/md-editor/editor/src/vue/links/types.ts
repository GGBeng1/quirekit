import type { SourceAnchor } from "@quirekit/msfe-core";

/** One explicitly activated Markdown link, independent of the live caret. */
export interface MdLinkContext {
  /** Original source occurrence; invalidated when its text changes. */ readonly anchor: SourceAnchor;
  /** Decoded safe address captured from source. */ readonly url: string;
  /** Viewport geometry captured once at activation. */ readonly position: { readonly left: string; readonly top: string };
}
