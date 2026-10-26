import type { TextDiagramLanguage } from "@quirekit/text-diagram";
import type { SourceAnchor } from "@quirekit/msfe-core";

/** Product dialogs that edit canonical Markdown through a mapped source intent. */
export type MdDialogKind = "link" | "image" | "inlineMath" | "displayMath" | "mermaid" | "textDiagram";

/** Disposable draft ownership, independent of viewport widgets. */
export interface MdDialogIntent {
  /** Original diagram grammar, independent of the dialog entry point. */ readonly language?: TextDiagramLanguage;
  /** Optional adjacent-block writer; confirmation publishes its complete serialized payload atomically. */ readonly insert?: (source: string) => boolean;
  /** Selected editor family. */ readonly kind: MdDialogKind;
  /** Original range retained across unrelated edits, invalid after touching/removing its source. */ readonly anchor: SourceAnchor;
  /** Whether saving updates a confirmed existing node. */ readonly existing: boolean;
  /** Formula or diagram draft. */ readonly body: string;
  /** Initial destination. */ readonly url: string;
  /** Initial decoded link label or image alternative. */ readonly label: string;
  /** False when linking a selected range or retaining a formatted label that must stay source-owned. */ readonly editableLabel?: boolean;
  /** Initial optional destination title. */ readonly title: string;
}
