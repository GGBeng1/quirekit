/** Options controlling canonical floating-object geometry and HTML output. */
export interface FloatingObjectOptions {
  /** Default persisted object width. */
  readonly width: number;
  /** Default persisted minimum object height. */
  readonly minHeight: number;
  /** Smallest width accepted by commands and provider compilation. */
  readonly minimumWidth: number;
  /** Smallest minimum height accepted by commands and provider compilation. */
  readonly minimumHeight: number;
  /** Deterministic keyboard nudge step. */
  readonly movementStep: number;
  /** HTML attributes merged into source-order fallback markup. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Persisted geometry owned by one floating-object node. */
export interface FloatingObjectAttributes {
  /** Requested object width before parent-constraint acceptance. */
  readonly width: number;
  /** Requested minimum object height before child-flow measurement. */
  readonly minHeight: number;
  /** Inline offset from the parent layout origin. */
  readonly inlineOffset: number;
  /** Block offset from the parent layout origin. */
  readonly blockOffset: number;
}

/** Deterministic transaction input for moving one floating object. */
export interface FloatingObjectMove {
  /** Inline-axis delta. */
  readonly inlineDelta: number;
  /** Block-axis delta. */
  readonly blockDelta: number;
}

/** Deterministic transaction input for resizing one floating object. */
export interface FloatingObjectResize {
  /** Directional handle that owns the resize gesture. */
  readonly direction: FloatingObjectResizeDirection;
  /** Inline-axis pointer displacement. */
  readonly inlineDelta: number;
  /** Block-axis pointer displacement. */
  readonly blockDelta: number;
}

/** Exact source snapshot restored when a captured gesture is cancelled. */
export interface FloatingObjectRestore {
  /** Absolute document position before the floating-object node. */
  readonly position: number;
  /** Canonical geometry captured before the gesture started. */
  readonly geometry: FloatingObjectAttributes;
}

/** Direction owned by one floating-object resize handle. */
export type FloatingObjectResizeDirection =
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west"
  | "north-west";

/** Internal payload carried by captured manipulation targets. */
export type FloatingObjectManipulation =
  | { readonly kind: "move" }
  | {
      /** Manipulation kind owned by a directional resize handle. */
      readonly kind: "resize";
      /** Exact directional handle that captured the pointer. */
      readonly direction: FloatingObjectResizeDirection;
    };
