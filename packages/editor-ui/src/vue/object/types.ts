import type { QuireDrawingFrame, QuireDrawingResizeHandle } from "@quirekit/view-engine";
/** Explicit DOM adapter input for the common drawing resize controller. */
export interface EditorUIObjectFrameProps {
 /** Optional document overlay host for continuous-flow products. */ readonly portalTarget?: HTMLElement | undefined;
 /** Current client-space frame before rotation. */ readonly frame: QuireDrawingFrame;
 /** Immutable semantic target; changing it cancels a drag. */ readonly identity: unknown;
 /** Available inline content width in CSS pixels. */ readonly maximumWidth: number;
 /** Whether source geometry is aspect locked. */ readonly lockAspectRatio?: boolean;
 /** Gesture clipping and lifecycle owner. */ readonly viewport: HTMLElement;
}
/** One fixed control around the common selection frame. */
export interface EditorUIObjectHandle {
 /** Canonical drawing controller handle. */ readonly value: QuireDrawingResizeHandle;
 /** Horizontal ratio. */ readonly x: number;
 /** Vertical ratio. */ readonly y: number;
 /** Native cursor for the unrotated control. */ readonly cursor: string;
 /** Accessible Chinese description. */ readonly label: string;
}
