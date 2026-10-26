import type { FlowchartNodeStyle } from "@quirekit/flowchart";
import type { FlowchartColorTarget, FlowchartEditor, FlowchartEditorState } from "@quirekit/flowchart-x6";

/** Live neutral controller context supplied to public Toolbar renderers. */
export interface FlowFormattingContext {
  /** Current instance identity; replacing it invalidates pending input. */ readonly editor: FlowchartEditor | undefined;
  /** Monotonic current-source invalidation; no serialization. */ readonly contentVersion?: number;
  /** Small reactive projection, never a serialized graph. */ readonly state: FlowchartEditorState;
}
/** Delayed color intent bound to the selection where the palette was opened. */
export interface FlowColorIntent {
  /** Intent discriminator. */ readonly kind: "color";
  /** Independent selected color channel. */ readonly target: FlowchartColorTarget;
  /** Opaque normalized HEX value. */ readonly color: string;
  /** Captured selection identity. */ readonly selection: string;
  /** Captured editor lifetime. */ readonly editor: FlowchartEditor;
}

/** Explicit typography application bound to its opening selection. */
export interface FlowTextIntent {
  /** Intent discriminator. */ readonly kind: "typography";
  /** Only the fields edited in the local draft. */ readonly style: FlowchartNodeStyle;
  /** Original selection identity. */ readonly selection: string;
  /** Original editor lifetime. */ readonly editor: FlowchartEditor;
}

/** Precise fields bound to the opening source and selection snapshot. */
export interface FlowGeometryIntent {
  /** Intent discriminator. */ readonly kind: "geometry";
  /** Original controller lifetime. */ readonly editor: FlowchartEditor;
  /** Guarded geometry snapshot. */ readonly expected: import("@quirekit/flowchart-x6").FlowchartGeometrySelection;
  /** Explicitly edited fields only. */ readonly patch: import("@quirekit/flowchart").FlowchartGeometryPatch;
}

/** Ordinary replacement captured from a shape picker. */
export interface FlowShapeIntent {
  /** Intent discriminator. */ readonly kind: "shape";
  /** Original controller lifetime. */ readonly editor: FlowchartEditor;
  /** Opening source/selection guard. */ readonly expected: import("@quirekit/flowchart-x6").FlowchartGeometrySelection;
  /** Ordinary target silhouette. */ readonly shape: import("@quirekit/flowchart").FlowchartShape;
}
