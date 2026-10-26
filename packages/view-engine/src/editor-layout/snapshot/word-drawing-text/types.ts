import type { QuireEditorState } from "@quirekit/core";
import type { QuireDrawingModelProfile, QuirePageModelProfile } from "../../../document-profile/types";
import type { QuireProseMirrorBlockInputOptions } from "../../prosemirror";
import type { QuireLayoutProviderExecutionLifecycle } from "../../../layout/providers";
import type { DrawingTextInsets } from "@quirekit/drawing-geometry";
import type { QuireLayoutContainer, QuireLayoutDocument } from "../../../layout/engine/types";

/** Canonical measured layout for one drawing-owned text-box story. */
export interface QuireWordDrawingTextStorySourceLayout {
  /** Stable persisted anchor object identity. */
  readonly objectId: string;
  /** Stable persisted drawing payload identity. */
  readonly drawingId: string;
  /** Stable persisted rich-text story identity. */
  readonly storyId: string;
  /** Normalized frame-to-text insets used by this measurement. */
  readonly insets: DrawingTextInsets;
  /** Clockwise drawing-frame rotation in the y-down document coordinate space. */
  readonly rotation: number;
  /** Complete natural text is affinely fitted to the accepted frame. */
  readonly fitFrame?: boolean;
  /** Native text fill opacity. */
  readonly opacity?: number;
  /** Horizontal reflection after measuring text. */
  readonly flipHorizontal?: boolean;
  /** Vertical reflection after measuring text. */
  readonly flipVertical?: boolean;
  /** Accepted inner text width in CSS pixels. */
  readonly width: number;
  /** Accepted inner text height in CSS pixels. */
  readonly height: number;
  /** Story-local measured layout with global ProseMirror ranges. */
  readonly layout: QuireLayoutContainer;
}

/** Options for compiling persisted text-box stories into canonical local layout. */
export interface CompileQuireWordDrawingTextStorySourcesOptions {
  /** Editor state containing anchors and the auxiliary story store. */
  readonly state: QuireEditorState;
  /** Block-input services shared with the body source collection pass. */
  readonly blockInputOptions: QuireProseMirrorBlockInputOptions;
  /** Default leaf block height used by recursive block layout. */
  readonly blockHeight: number;
  /** Vertical gap between story blocks. */
  readonly blockGap: number;
  /** Active provider lifecycle allocated for this snapshot pass. */
  readonly providerExecutionLifecycle: QuireLayoutProviderExecutionLifecycle;
  /** Page semantics listing the document's auxiliary stories. */
  readonly pageModel: QuirePageModelProfile;
  /** Drawing semantics reading text-box anchors. */
  readonly drawingModel: QuireDrawingModelProfile;
}

/** Candidate drawing story retained while scanning live source nodes. */
export interface QuireWordDrawingTextCandidate {
  /** Stable persisted anchor object identity. */
  readonly objectId: string;
  /** Stable persisted drawing payload identity. */
  readonly drawingId: string;
  /** Stable persisted rich-text story identity. */
  readonly storyId: string;
  /** Frame-to-text insets. */
  readonly insets: DrawingTextInsets;
  /** Clockwise drawing-frame rotation in degrees. */
  readonly rotation: number;
  /** Whether the complete story fits the drawing frame. */
  readonly fitFrame: boolean;
  /** Text fill opacity. */
  readonly opacity: number;
  /** Horizontal reflection. */
  readonly flipHorizontal: boolean;
  /** Vertical reflection. */
  readonly flipVertical: boolean;
  /** Available text width. */
  readonly width: number;
  /** Available text height. */
  readonly height: number;
}


/** Options for attaching drawing-text story occurrences to accepted objects. */
export interface AttachQuireWordDrawingTextInstancesOptions {
  /** Already paginated body layout containing accepted anchor products. */
  readonly layoutDocument: QuireLayoutDocument;
  /** Canonical measured drawing-text story sources. */
  readonly sources: readonly QuireWordDrawingTextStorySourceLayout[];
}
