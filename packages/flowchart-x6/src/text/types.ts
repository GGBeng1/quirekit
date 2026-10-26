import type { FlowchartTextFormat } from "@quirekit/flowchart";
import type { NodeMetadata } from "@antv/x6";
/** One JSON SVG element inferred from X6's public node metadata contract. */
export type CaptionMarkup = Exclude<NonNullable<NodeMetadata["markup"]>, string | readonly unknown[]>;
/** Resolved typography for one visible run. */
export interface CaptionFormat extends FlowchartTextFormat {
  /** Effective weight. */ readonly bold: boolean;
  /** Effective posture used by both native measurement and SVG. */ readonly italic: boolean;
  /** Effective underline, including the link default. */ readonly underline: boolean;
  /** Effective strike. */ readonly strike: boolean;
  /** Effective pixel size. */ readonly fontSize: number;
  /** Effective foreground. */ readonly color: string;
}
/** One measured grapheme or explicit format-boundary fragment. */
export interface CaptionGlyph {
  /** Literal source segment. */ readonly text: string;
  /** Effective typography. */ readonly format: CaptionFormat;
  /** Stable format key within this layout. */ readonly key: string;
}
/** Positioned SVG caption run, independent of graph pan/zoom. */
export interface CaptionRun extends CaptionGlyph {
  /** Node-local left coordinate. */ readonly x: number;
  /** Node-local baseline. */ readonly y: number;
  /** Measured width. */ readonly width: number;
}
/** Native font measurement supplied by the adapter's document owner. */
export type CaptionMeasure = (text: string, format: CaptionFormat) => number;
/** Measured line before horizontal/vertical positioning. */
export interface CaptionLine {
  /** Ordered style runs. */ readonly runs: readonly CaptionGlyph[];
  /** Maximum font-based line height. */ readonly height: number;
}
