import type { QuireDisplayCommand, QuireRect } from "@quirekit/renderer";
import type { MountedDrawingPreviewState } from "../../drawing-interaction";
import type { QuireViewDisplayListTransform, QuireViewRenderResult } from "../../../types";
import type { QuireSurfaceConfig } from "@quirekit/view-engine";

/** Inputs used to project one drawing manipulation preview onto retained paint. */
export interface CreateMountedDrawingPreviewRenderResultOptions {
  /** Latest committed render result whose layout and targets remain authoritative. */
  readonly previousRenderResult: QuireViewRenderResult;
  /** Active or most recently active manipulation state identifying the owner. */
  readonly state: MountedDrawingPreviewState;
  /** Whether preview geometry should replace accepted selection chrome. */
  readonly active: boolean;
  /** Semantic surface colors applied to transient selected-object chrome. */
  readonly surfaceConfig?: QuireSurfaceConfig | undefined;
  /** Binds cached browser resources only for the active object's replacement commands. */
  readonly prepareDrawingPreviewContent?: QuireViewDisplayListTransform | undefined;
}

/** Exact command replacement derived for one drawing preview frame. */
export interface MountedDrawingPreviewCommandProjection {
  /** Accepted or transient commands inserted into the overlay authority. */
  readonly replacementCommands: readonly QuireDisplayCommand[];
  /** Exact accepted and prior-preview command ids removed before insertion. */
  readonly replacedCommandIds: ReadonlySet<string>;
}

/** Exact content-plane replacement derived for one drawing preview frame. */
export interface MountedDrawingContentPreviewCommandProjection {
  /** Accepted or transient object commands inserted into the content authority. */
  readonly replacementCommands: readonly QuireDisplayCommand[];
  /** Exact accepted content command ids removed before insertion. */
  readonly replacedCommandIds: ReadonlySet<string>;
}

/** Accepted drawing-text paint and its exact inner frame. */
export interface MountedDrawingStoryContent {
  /** Directly owned story commands in retained paint order. */
  readonly commands: readonly QuireDisplayCommand[];
  /** Accepted document-space inner text rectangle preserving text insets. */
  readonly rect: QuireRect;
}
