import type { FlowchartEntity, FlowchartUmlClass } from "../modeling/types";
import type { FlowchartImage } from "../media/types";
/** Admitted SVG shapes; unknown future shapes must not be silently converted. */
export type FlowchartShape = "process" | "terminator" | "decision" | "data" | "document" | "ellipse"
  | "rectangle" | "circle" | "triangle" | "hexagon" | "cloud" | "note" | "subprocess" | "database"
  | "manual-input" | "delay" | "display" | "off-page"
  | "pentagon" | "octagon" | "trapezoid" | "right-triangle" | "star" | "plus"
  | "multi-document" | "manual-operation" | "stored-data" | "internal-storage" | "sort" | "summing-junction" | "or-junction" | "merge"
  | "arrow-right" | "arrow-left" | "arrow-up" | "arrow-down" | "arrow-horizontal" | "arrow-vertical" | "text" | "callout"
  | "uml-class" | "er-entity" | "group" | "container" | "lane-horizontal" | "lane-vertical" | "lifeline" | "activation"
  | "actor" | "server" | "browser" | "mobile" | "component" | "package" | "queue"
  | "bracket-left" | "bracket-right" | "brace" | "actor-lifeline" | "destruction"
  | "sequence-alt" | "sequence-opt" | "sequence-loop" | "phase-horizontal" | "phase-vertical" | "image";
/** Persistent visual treatment, independent of connection geometry. */
export type FlowchartDrawingStyle = "standard" | "sketch" | "pencil";
/** Marker geometry at either end of a connection. */
export type FlowchartArrow = "none" | "block" | "open" | "diamond" | "circle" | "er-one" | "er-many" | "er-zero-one" | "er-one-many" | "er-zero-many" | "triangle-hollow" | "diamond-hollow";
/** Visual distinction at an actual non-endpoint line crossing. */
export type FlowchartCrossing = "none" | "jump" | "gap";
/** How a routed sequence of points becomes a curve. */
export type FlowchartConnector = "sharp" | "rounded" | "smooth";
/** Portable connection geometry, independent of its pen treatment. */
export interface FlowchartConnection {
  /** Requested automatic route; manual vertices remain authoritative. */ readonly routing: "orthogonal" | "straight";
  /** Optional crossing treatment, supported by non-smooth connectors. */ readonly crossing?: FlowchartCrossing;
  /** Corner geometry; absent preserves the original rounded default. */ readonly connector?: FlowchartConnector;
}
/** Fixed connection ports in node-local coordinates. */
export type FlowchartPort = "top" | "right" | "bottom" | "left";
/** World-space CSS coordinates, independent of the viewport. */
export interface FlowchartPoint {
  /** Horizontal world coordinate. */ readonly x: number;
  /** Vertical world coordinate. */ readonly y: number;
}
/** A node attachment or a free world-space endpoint. */
export type FlowchartTerminal = FlowchartPoint | {
  /** Referenced node identity. */ readonly node: string;
  /** Optional fixed port; absent means the node outline. */ readonly port?: FlowchartPort;
  /** Optional attachment in node-width/height fractions [0,1], mutually exclusive with port. */ readonly anchor?: FlowchartPoint;
};
/** Optional overrides; absent values follow the current presentation theme. */
export interface FlowchartNodeStyle {
  /** Drawing preset; absent uses precise standard strokes. */ readonly drawing?: FlowchartDrawingStyle;
  /** Six-digit hexadecimal fill. */ readonly fill?: string;
  /** Six-digit hexadecimal outline. */ readonly stroke?: string;
  /** Six-digit hexadecimal text color. */ readonly color?: string;
  /** Text size in world CSS pixels, 10–72. */ readonly fontSize?: number;
  /** Alignment within the shape-safe caption box. */ readonly textAlign?: "left" | "center" | "right";
  /** Vertical anchoring within the shape-safe caption box. */ readonly verticalAlign?: "top" | "middle" | "bottom";
  /** Additional inset in CSS pixels, 0–80, clamped to the caption dimensions. */ readonly padding?: number;
  /** Whether text is semibold. */ readonly bold?: boolean;
}
/** A positioned shape with literal multiline text. */
export interface FlowchartNode extends FlowchartPoint {
  /** Stable graph-local identity. */ readonly id: string;
  /** Direct editing lock; ancestor locks also apply. */ readonly locked?: boolean;
  /** Optional owning container or participant identity; positions remain world-space. */ readonly parent?: string;
  /** Semantic shape name. */ readonly shape: FlowchartShape;
  /** Width in world CSS pixels. */ readonly width: number;
  /** Height in world CSS pixels. */ readonly height: number;
  /** Clockwise centered angle in [0,360); absent means zero. Ordinary shapes only. */ readonly rotation?: number;
  /** Mirror local shape geometry horizontally without reversing text glyphs. */ readonly flipX?: boolean;
  /** Mirror local shape geometry vertically without reversing text glyphs. */ readonly flipY?: boolean;
  /** Structured attributes and operations, required only for uml-class shapes. */ readonly uml?: FlowchartUmlClass;
  /** Structured entity fields, required only for er-entity shapes. */ readonly entity?: FlowchartEntity;
  /** Literal text, never HTML. */ readonly text: string;
  /** Self-contained resource, required exclusively on image nodes. */ readonly image?: FlowchartImage;
  /** Explicit formatting only, excluding derived theme values. */ readonly style: FlowchartNodeStyle;
  /** Ordered partial caption formats; the text property remains the only text authority. */ readonly textSpans?: readonly import("../text/types").FlowchartTextSpan[];
}
/** Admitted connector formatting. */
export interface FlowchartEdgeStyle {
  /** Drawing preset; absent uses precise standard strokes. */ readonly drawing?: FlowchartDrawingStyle;
  /** Six-digit hexadecimal stroke. */ readonly stroke?: string;
  /** Stroke width in world CSS pixels, 1–8. */ readonly width?: number;
  /** Whether the line is dashed. */ readonly dashed?: boolean;
  /** Source marker, absent defaults to none. */ readonly sourceArrow?: FlowchartArrow;
  /** Target marker, absent defaults to block. */ readonly targetArrow?: FlowchartArrow;
}
/** Directed connection with optional manually positioned bends. */
export interface FlowchartEdge extends FlowchartConnection {
  /** Stable identity unique among nodes and edges. */ readonly id: string;
  /** Prevents direct connector editing. */ readonly locked?: boolean;
  /** Starting attachment. */ readonly source: FlowchartTerminal;
  /** Ending attachment. */ readonly target: FlowchartTerminal;
  /** Ordered manual bends; automatic routing is not stored here. */ readonly vertices: readonly FlowchartPoint[];
  /** Literal label text. */ readonly label: string;
  /** Relative path position from 0 to 1. */ readonly labelPosition: number;
  /** Normal offset in CSS pixels, or an axis vector for a degenerate path; absent defaults to 12. */ readonly labelOffset?: number | FlowchartPoint;
  /** Explicit connector formatting. */ readonly style: FlowchartEdgeStyle;
}
/** Versioned document shared across host editors. */
export interface FlowchartDocument {
  /** Distinguishes native graphs from future external plugin formats. */ readonly format: "quirekit-flowchart";
  /** Canonical schema version. */ readonly version: 1;
  /** Host revision; only a successful save increments it. */ readonly revision: number;
  /** Optional physical output settings; older documents retain an absent field. */ readonly page?: import("../pages/types").FlowchartPageSettings;
  /** Ordered shapes. */ readonly nodes: readonly FlowchartNode[];
  /** Ordered connections. */ readonly edges: readonly FlowchartEdge[];
}
/** Exact source-bound vector snapshot, excluding editing controls. */
export interface FlowchartSnapshot {
  /** Complete SVG markup. */ readonly svg: string;
  /** Natural width in CSS pixels. */ readonly width: number;
  /** Natural height in CSS pixels. */ readonly height: number;
  /** Exact serialized source, including unsaved edits. */ readonly source: string;
  /** Host revision, not a unique cache key for unsaved drafts. */ readonly revision: number;
}

/** Direct connection-layout overrides; automatic route points are never persisted. */
export interface FlowchartEdgeLayout {
  /** Ordered world-space manual bends. */ readonly vertices?: readonly FlowchartPoint[];
  /** Relative path label position, 0–1. */ readonly labelPosition?: number;
  /** Signed normal distance or a degenerate-path axis offset. */ readonly labelOffset?: number | FlowchartPoint;
}
