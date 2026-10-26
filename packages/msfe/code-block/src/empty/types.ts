import type { MsfeEditor } from "@quirekit/msfe-core";

/** Mapped input entry, separate from persisted code attributes. */
export interface EmptyCodeProps {
  /** Current opening fence source offset. */
  readonly from: number;
  /** Current permission. */
  readonly readOnly: boolean;
  /** Accessible action text. */
  readonly label: string;
  /** Canonical editor owner, resolved only after mount. */
  readonly editor: () => MsfeEditor;
}
