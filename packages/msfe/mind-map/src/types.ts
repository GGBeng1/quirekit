import type { MsfeEditor, MsfeSourceRange, SourceBlock } from "@quirekit/msfe-core";
import type { MindMapEmbed, MindMapEditRequest } from "@quirekit/mind-map";
/** Product-neutral task composition. */
export interface MsfeMindMapOptions {
  /** @param request - Mapped source task. @param editor - Owning source editor. @returns Disposable UI. */
  readonly open: ((request: MindMapEditRequest, editor: MsfeEditor) => { close(): void }) | null;
}
/** Source codec attributes. */
export interface MsfeMindMapAttributes {
  /** Validated editable source and its matching preview. */ readonly mind: MindMapEmbed;
}
/** Static block projection inputs. */
export interface MsfeMindMapPreviewProps extends MsfeMindMapAttributes {
  /** Current mapped source location. */ readonly range: MsfeSourceRange;
  /** Parent editor's read permission. */ readonly readOnly: boolean;
}
/** An admitted complete sibling block or leading whitespace insertion point. */
export interface MindMapInsertionTarget extends MsfeSourceRange {
  /** Neighbor owning syntax; null only before the first non-whitespace source. */
  readonly block: SourceBlock | null;
}
