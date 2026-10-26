import type { FlowchartDocument } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { QuireKitTheme } from "@quirekit/ui";
import type { FlowLibraryItem, FlowLibraryStore } from "../../library/types";
/** One library dialog, bound to one authoring instance. */
export interface FlowLibraryPanelProps {
  /** Captured neutral authoring controller. */ readonly editor: FlowchartEditor;
  /** Current UI and preview appearance. */ readonly theme: QuireKitTheme;
  /** Optional host-owned shared persistence. */ readonly store?: FlowLibraryStore | undefined;
  /** Initial task; subsequent actions remain inside the dialog. */ readonly intent: "browse" | "template" | "component";
  /** Whether applying a record to the current graph is disallowed. */ readonly disabled: boolean;
}
/** Editable name over an immutable captured graph. */
export interface FlowLibraryDraft {
  /** Existing record for rename; absent for a new capture. */ readonly original?: FlowLibraryItem;
  /** Reuse mode. */ readonly kind: "template" | "component";
  /** Source captured at the explicit save intent. */ readonly document: FlowchartDocument;
}
