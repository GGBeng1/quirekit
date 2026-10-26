import type { MsfeEditor, MsfeSourceRange, SourceAnchor } from "@quirekit/msfe-core";

/** Read-only caret measurement made after a committed @ input. */
export interface MdMentionTrigger {
  /** Editor that accepted the trigger. */ readonly editor: MsfeEditor;
  /** Source range containing the trigger. */ readonly range: MsfeSourceRange;
  /** Left edge in viewport CSS pixels. */ readonly x: number;
  /** Bottom edge in viewport CSS pixels. */ readonly y: number;
}

/** Active pointer-anchored surface, separate from the source authority. */
export interface MdMentionSession {
  /** Disposable, mapped original source range. */ readonly anchor: SourceAnchor;
  /** Initial caret viewport location. */ readonly point: { readonly x: number; readonly y: number };
  /** `document` when opened by `[[` to link a host document. */ readonly kind?: "mention" | "document";
}
