/** Explicit inline overrides; missing fields inherit the node style. */
export interface FlowchartTextFormat {
  /** Weight override, including an explicit normal weight. */ readonly bold?: boolean;
  /** Local italic posture; absent uses upright glyphs. */ readonly italic?: boolean;
  /** Underline override; absent follows the link's default underline. */ readonly underline?: boolean;
  /** Local line through glyphs; absent is off. */ readonly strike?: boolean;
  /** Local CSS-pixel size, 10–72. */ readonly fontSize?: number;
  /** Six-digit hexadecimal foreground. */ readonly color?: string;
  /** Absolute HTTP(S) or mailto destination. */ readonly link?: string;
}
/** Nonoverlapping UTF-16 range in the one canonical caption string. */
export interface FlowchartTextSpan extends FlowchartTextFormat {
  /** Inclusive offset, never inside a surrogate pair. */ readonly from: number;
  /** Exclusive offset, greater than from. */ readonly to: number;
}
/** Null removes an explicit override from the selected range. */
export interface FlowchartTextPatch {
  /** Weight or reset. */ readonly bold?: boolean | null;
  /** Italic posture or reset. */ readonly italic?: boolean | null;
  /** Underline or reset to the link's default. */ readonly underline?: boolean | null;
  /** Strike or reset. */ readonly strike?: boolean | null;
  /** Size or reset. */ readonly fontSize?: number | null;
  /** Color or reset. */ readonly color?: string | null;
  /** Link or reset. */ readonly link?: string | null;
}
