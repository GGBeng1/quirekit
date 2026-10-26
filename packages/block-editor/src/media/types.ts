import type { NodeViewRenderer } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
/** Persistent display geometry, independent of editable diagram source and raster bytes. */
export interface BlockMediaPresentation {
 /** CSS pixel width; null fits the document column. */ readonly width: number | null;
 /** CSS pixel height; null retains the source ratio. */ readonly height: number | null;
 /** Alignment within the flow column. */ readonly align: "left" | "center" | "right";
 /** Clockwise quarter-turn rotation. */ readonly rotation: number;
 /** Horizontal source reflection. */ readonly flipX: boolean;
 /** Vertical source reflection. */ readonly flipY: boolean;
 /** Lock dimensions to the displayed aspect ratio. */ readonly lockAspectRatio: boolean;
 /** Fractions cropped from original source edges. */ readonly crop: Readonly<{ top: number; right: number; bottom: number; left: number }>;
 /** Visible object caption. */ readonly caption: string;
 /** Accessible source description. */ readonly alt: string;
 /** Optional safe image hyperlink. */ readonly href: string;
}
/** Immutable selection snapshot for asynchronous object tasks and gesture commits. */
export interface BlockMediaTarget {
 /** Document identity at capture time. */ readonly doc: Node;
 /** Position before the atom. */ readonly pos: number;
 /** Exact immutable source node. */ readonly node: Node;
}

/** Existing public HTML NodeView contract used by the source adapter. */
export type BlockMediaNodeView = ReturnType<NodeViewRenderer>;
