import type { FlowchartArrow, FlowchartEdgeStyle } from "@quirekit/flowchart";

/** One visual formatting choice, expressed in the menu's local SVG coordinates. */
export interface FlowStyleOption {
  /** Existing authoring intent. */ readonly value: string;
  /** Visible and accessible choice name. */ readonly label: string;
  /** Illustrative centerline in a 80 × 24 CSS pixel view box. */ readonly path: string;
  /** Demonstrated line weight, independent of canvas zoom. */ readonly width?: number;
  /** Whether the sample is dashed. */ readonly dashed?: boolean;
  /** Optional marker at the sample's starting point. */ readonly start?: FlowchartArrow;
  /** Optional marker at the sample's ending point. */ readonly end?: FlowchartArrow;
}
/** Mutually exclusive visual menu section. */
export interface FlowStyleGroup {
  /** Stable section key. */ readonly value: string;
  /** Human-readable section name. */ readonly label: string;
  /** Common current selection; empty means mixed or outside the available presets. */ readonly selected: string;
  /** Visible choices in product order. */ readonly options: readonly FlowStyleOption[];
}

/** A visual relation choice with one complete marker/dash update. */
export interface FlowRelationPreset extends FlowStyleOption {
  /** Both endpoints and line pattern, preserving all other properties. */ readonly style: FlowchartEdgeStyle;
}
