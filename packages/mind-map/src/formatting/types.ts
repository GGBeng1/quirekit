/** Explicit topic formatting. Missing properties resolve from the host theme. */
export interface MindMapNodeStyle {
  /** Font size in unscaled CSS pixels, integral 8–72. */ readonly fontSize?: number;
  /** Explicit bold or normal text weight. */ readonly bold?: boolean;
  /** Literal six-digit RGB text color. */ readonly color?: string;
  /** Literal six-digit RGB fill, or transparent. */ readonly fill?: string;
  /** Literal six-digit RGB outline color. */ readonly borderColor?: string;
  /** Node outline thickness in CSS pixels, 0–8. */ readonly borderWidth?: number;
  /** Measured node outline. */ readonly shape?: "rectangle" | "rounded" | "ellipse" | "diamond";
  /** Incoming connector color; independent roots have no incoming connector. */ readonly lineColor?: string;
  /** Incoming connector thickness in CSS pixels, 0.5–8. */ readonly lineWidth?: number;
  /** Incoming connector stroke pattern. */ readonly linePattern?: "solid" | "dashed";
  /** Path geometry from this topic to its children. */ readonly lineStyle?: "curve" | "elbow" | "direct";
}

/** Null clears one explicit property; omission leaves the property unchanged. */
export type MindMapStylePatch = { readonly [Key in keyof MindMapNodeStyle]?: MindMapNodeStyle[Key] | null };

/** Selection formatting; null means mixed, undefined means theme default. */
export type MindMapFormatting = { readonly [Key in keyof MindMapNodeStyle]?: MindMapNodeStyle[Key] | null };
