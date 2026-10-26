/** Ordering within each independent background/connection/shape paint plane. */
export type FlowchartLayer = "front" | "back" | "forward" | "backward";
/** Portable ownership and editing-permission commands. */
export type FlowchartObjectCommand = "group" | "ungroup" | "lock" | "unlock" | "unlock-all" | `layer-${FlowchartLayer}`;
