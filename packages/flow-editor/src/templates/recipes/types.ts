import type { FlowchartPoint, FlowchartPort, FlowchartShape } from "@quirekit/flowchart";
/** Shared original template colors. */
export type RecipeTone = "blue" | "green" | "orange" | "purple" | "slate";
/** Compact authored node data; layout remains explicit and editable. */
export type RecipeNode = readonly [id: string, shape: FlowchartShape, x: number, y: number, text: string, tone?: RecipeTone, width?: number, height?: number];
/** Authored connection, with optional contour ports and literal bends. */
export type RecipeLink = readonly [from: string, to: string, label?: string, sourcePort?: FlowchartPort, targetPort?: FlowchartPort, vertices?: readonly FlowchartPoint[]];
