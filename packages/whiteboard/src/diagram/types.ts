import type { WhiteboardInlinePreview, WhiteboardScene } from "../types";

/** A transient node edit; omitted fields preserve the existing element. */
export interface WhiteboardDiagramNode {
  /** Stable Excalidraw element identity. */ readonly id: string;
  /** New nodes default to rectangle; existing types cannot be changed. */ readonly shape?: "rectangle" | "ellipse" | "diamond" | "text";
  /** Text inside the shape, or the text element's content. */ readonly label?: string;
  /** Scene-local left position in pixels. */ readonly x?: number;
  /** Scene-local top position in pixels. */ readonly y?: number;
  /** Shape width in scene pixels. */ readonly width?: number;
  /** Shape height in scene pixels. */ readonly height?: number;
  /** Hex fill or transparent. */ readonly fill?: string;
  /** Hex stroke/text color. */ readonly color?: string;
  /** Label font size in pixels. */ readonly fontSize?: number;
}

/** A transient directed edge edit. */
export interface WhiteboardDiagramEdge {
  /** Stable arrow identity. */ readonly id: string;
  /** Source shape element ID. */ readonly from: string;
  /** Destination shape element ID. */ readonly to: string;
  /** Optional text attached to the arrow. */ readonly label?: string;
  /** Hex stroke/text color. */ readonly color?: string;
}

/** Bounded edits projected into the native scene; never stored as another model. */
export interface WhiteboardDiagramPatch {
  /** Optional new board title. */ readonly title?: string;
  /** Nodes to create or update, leaving other nodes alone. */ readonly nodes?: readonly WhiteboardDiagramNode[];
  /** Connections to create or update. */ readonly edges?: readonly WhiteboardDiagramEdge[];
  /** Element IDs to remove, including their labels and incident connections. */ readonly remove?: readonly string[];
}

/** Explicit rendering authority installed by the host. */
export type WhiteboardSceneRenderer = (scene: WhiteboardScene) => Promise<{
  /** Normalized native source used for the preview. */ readonly scene: WhiteboardScene;
  /** Matching bounded PNG snapshot. */ readonly preview: WhiteboardInlinePreview;
}>;

/** Writable native element used only while preparing an isolated snapshot. */
export type DiagramElement = Record<string, import("../types").WhiteboardJson> & {
  /** Native identity. */ id: string;
  /** Native type discriminator. */ type: string;
  /** Native left position. */ x: number;
  /** Native top position. */ y: number;
  /** Native width. */ width: number;
  /** Native height. */ height: number;
};
