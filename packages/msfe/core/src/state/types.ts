import type { EditorState, TransactionSpec } from "@quirekit/cm-state";

/** Presentation modes sharing one canonical document and history. */
export type MsfeMode = "source" | "live" | "locked";

/** File formatting retained outside logical document offsets. */
export interface SourceFormat {
  /** Original homogeneous line separator. */
  readonly lineEnding: "\n" | "\r\n";
  /** Whether an initial byte-order marker was present in the supplied string. */
  readonly bom: boolean;
}

/** Accepted logical source plus its export policy. */
export interface MarkdownInput extends SourceFormat {
  /** Logical LF source, excluding the optional initial BOM. */
  readonly text: string;
}

/** Pure command planner; null rejects the entire user action. */
export type MsfeCommand = (state: EditorState) => TransactionSpec | null;
