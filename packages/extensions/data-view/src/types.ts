import type { QuireEditor, QuireNodeViewRenderer } from "@quirekit/core";
import type { QuireLayoutProviderRegistration } from "@quirekit/core/layout-provider";
import type { DataViewEditRequest, DataViewEmbed } from "@quirekit/data-view";

/** Optional mounted host behavior; the MIT node remains usable headlessly. */
export interface DataViewOptions {
  /** Optional interactive HTML renderer, which owns its activation and input events. Null output keeps the static preview. */
  readonly render?: QuireNodeViewRenderer | null;
  /** Host-owned workspace.
   * @param request - Conditional document target.
   * @param editor - Owning instance.
   * @returns Disposable task.
   */
  readonly open: ((request: DataViewEditRequest, editor: QuireEditor) => {close(): void}) | null;
  /** Host-owned renderer registration, keeping engine dependencies out of this adapter.
   * @returns Layout contributions.
   */
  readonly layouts: (() => readonly QuireLayoutProviderRegistration[]) | null;
}
/** Explicit insertion range, captured before a modal opens. */
export interface DataViewInsertion {
  /** Complete portable source. */ readonly value: DataViewEmbed;
  /** Start in current document coordinates. */ readonly from: number;
  /** End in current document coordinates. */ readonly to: number;
}
/** Compare-and-swap replacement of one atom. */
export interface DataViewReplacement {
  /** Mapped node position. */ readonly position: number;
  /** Exact original source bytes. */ readonly expected: string;
  /** Complete replacement. */ readonly value: DataViewEmbed;
}
