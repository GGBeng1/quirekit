import type { FlowLibraryStore } from "../library/types";
import type { FlowchartDocument, FlowchartSnapshot, FlowchartPlaybackTrace, FlowchartPlaybackState } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { QuireKitTheme } from "@quirekit/ui";
/** Public component inputs; replacing document explicitly opens another source. */
export interface FlowEditorProps {
  /** Optional teaching sequence, loaded without automatically advancing it; never persisted in the graph source. */ readonly playback?: FlowchartPlaybackTrace | undefined;
  /** Presentation hides authoring controls and forces a read-only graph; defaults to edit. */ readonly mode?: "edit" | "presentation" | undefined;
  /** Shared library service; omitted uses same-origin local storage. */ readonly libraryStore?: FlowLibraryStore | undefined;
  /** Initial portable source, detached on mount. */ readonly document: FlowchartDocument;
  /** Accessible workspace title. */ readonly title?: string | undefined;
  /** Host permission, applied immediately. */ readonly readOnly?: boolean | undefined;
  /** Theme shared by graph and public controls. */ readonly theme?: QuireKitTheme | undefined;
}
/** Public component ref contract. */
export interface FlowEditorHandle {
  /** @returns Current source after native text commit. */ getDocument(): Promise<FlowchartDocument>;
  /** @returns Exact source-bound SVG. */ exportSvg(): Promise<FlowchartSnapshot>;
  /** Focuses the graph. */ focus(): void;
  /** Fits content to the current container. */ fit(): void;
}
/** Typed lifecycle events. */
export interface FlowEditorEmits {
  /** Reports semantic playback boundaries, without publishing animation frames. */ playback: [state: FlowchartPlaybackState];
  /** Makes the neutral controller available to the host. */ ready: [editor: FlowchartEditor];
  /** Invalidates source, without serializing on drag. */ change: [count: number];
  /** Reports mount/input/command failures. */ error: [error: unknown];
}
