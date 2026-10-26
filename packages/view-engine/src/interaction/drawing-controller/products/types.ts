import type { DrawingPayload } from "@quirekit/drawing-geometry";
import type { QuireDrawingControlReference } from "../../../drawing/control-points/types";
import type {
  QuireDrawingFrame,
  QuireDrawingManipulationOperation,
  QuireDrawingResizeHandle
} from "../types";
import type {
  QuireDisplayCommand,
  QuireViewTarget
} from "@quirekit/renderer";

/** Payload dispatched by selected drawing manipulation controls. */
export interface QuireDrawingManipulationEventPayload {
  /** Stable source anchor identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Manipulation family requested by the target. */
  readonly operation: QuireDrawingManipulationOperation;
  /** Semantic endpoint or preset adjustment reference. */
  readonly control?: QuireDrawingControlReference | undefined;
  /** Directional handle required for resize. */
  readonly handle?: QuireDrawingResizeHandle | undefined;
  /** Whether resize must preserve the accepted aspect ratio. */
  readonly lockAspectRatio: boolean;
}

/** Payload dispatched by the selected text-box entry target. */
export interface QuireDrawingEnterTextEventPayload {
  /** Stable source anchor identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Stable referenced rich-text story identity. */
  readonly storyId: string;
}

/** Source facts required to create selected drawing controls. */
export interface QuireDrawingSelectedObjectViewOptions {
  /** Source geometry used to derive the appropriate local controls. */
  readonly drawing?: DrawingPayload | undefined;
  /** Stable source anchor identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Whether resize must preserve the accepted aspect ratio. */
  readonly lockAspectRatio: boolean;
  /** Whether this drawing exposes a direct rotation handle outside its frame. */
  readonly showRotationHandle?: boolean | undefined;
  /** Whether the frame offers movement bands; embedding owners may allow resize only. */
  readonly showMoveBands?: boolean | undefined;
  /** Referenced rich-text story exposed by a text box. */
  readonly storyId?: string | undefined;
  /** Inline-start inset of the editable text region. */
  readonly textInsetLeft?: number | undefined;
  /** Block-start inset of the editable text region. */
  readonly textInsetTop?: number | undefined;
  /** Width of the editable text region. */
  readonly textWidth?: number | undefined;
  /** Height of the editable text region. */
  readonly textHeight?: number | undefined;
}

/** Inputs required to rotate compiled selected-object artifacts. */
export interface QuireDrawingSelectionProductTransformOptions {
  /** Selected-only display commands in document coordinates. */
  readonly commands: readonly QuireDisplayCommand[];
  /** Selected-only interaction targets in document coordinates. */
  readonly targets: readonly QuireViewTarget[];
  /** Accepted or transient drawing frame that owns the artifacts. */
  readonly frame: QuireDrawingFrame;
}

/** Selected-object artifacts after one frame transform is applied. */
export interface QuireDrawingSelectionProductTransformResult {
  /** Transformed display commands. */
  readonly commands: readonly QuireDisplayCommand[];
  /** Transformed targets carrying exact hit geometry. */
  readonly targets: readonly QuireViewTarget[];
}
