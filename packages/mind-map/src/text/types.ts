import type { MindMapDocument } from "../model/types";
/** Portable topic-text exchange formats. */
export type MindMapTextFormat = "markdown" | "outline";
/** Explicit conversion difference compatible with the shared file feedback surface. */
export interface MindMapTextDiagnostic {
  /** Whether meaning was approximated or a field was omitted. */ readonly code: "fallback" | "unsupported-field";
  /** Source line or document field. */ readonly path: string;
  /** Literal explanation, never interpreted as markup. */ readonly message: string;
}
/** Text conversion result ready for the shared editor. */
export interface MindMapTextImport {
  /** Validated fresh topic forest. */ readonly document: MindMapDocument;
  /** Conversion differences rather than silent loss. */ readonly diagnostics: readonly MindMapTextDiagnostic[];
}
/** Text export result; native JSON remains the lossless format. */
export interface MindMapTextExport {
  /** Complete literal outline including folded descendants. */ readonly text: string;
  /** Fields or line breaks absent from the textual format. */ readonly diagnostics: readonly MindMapTextDiagnostic[];
}
/** Mutable parser-local topic, frozen only by the canonical validator. */
export interface TextTopic {
  /** Fresh parse-local identity. */ id: string;
  /** Literal content without executing inline HTML. */ text: string;
  /** Imported topics start expanded. */ collapsed: false;
  /** Ordered descendants. */ children: TextTopic[];
}
