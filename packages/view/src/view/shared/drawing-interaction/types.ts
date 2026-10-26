import type { DrawingAnchorPatch, DrawingKind, DrawingShapeGeometry } from "@quirekit/drawing-geometry";
import type { QuireEditor } from "@quirekit/core";
import type {
  QuireViewEventHandler,
  QuireViewScope,
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireDrawingControllerState,
  QuireDrawingCreatingState,
  QuireDrawingEnterTextEventPayload,
  QuireDrawingFrame,
  QuireDrawingManipulatingState,
  QuireDrawingManipulationEventPayload,
  QuireInteractionSelectionTarget,
  QuireRetainedLayoutSnapshot
} from "@quirekit/view-engine";
import type { QuireEditorViewStatus } from "../types";

/** Target-page source and geometry facts shared by preview and final commit. */
export interface MountedDrawingAnchorRelocation {
  /** Exact source position where the inline anchor should be inserted. */
  readonly targetPosition: number;
  /** Derived target page used only by mounted layout and interaction. */
  readonly targetPageIndex: number;
  /** Final frame after page-gap resolution clamps its leading corner. */
  readonly frame: QuireDrawingFrame;
  /** Exact target-page reference used by horizontal offset placement. */
  readonly inlineReferenceRect: QuireRect;
  /** Exact target-paragraph reference used by vertical offset placement. */
  readonly blockReferenceRect: QuireRect;
}

/** Manipulation preview enriched with optional cross-page source ownership. */
export type MountedDrawingManipulationPreviewState =
  QuireDrawingManipulatingState & {
    /** Target-page relocation resolved from the accepted layout snapshot. */
    readonly relocation?: MountedDrawingAnchorRelocation | undefined;
  };

/** Drawing states that can be painted without committing source changes. */
export type MountedDrawingPreviewState =
  | QuireDrawingCreatingState
  | MountedDrawingManipulationPreviewState;

/** Options used to arm one product-level drawing creation gesture. */
export interface MountedDrawingCreationOptions {
  /** Drawing geometry family to create. */
  readonly drawingKind?: DrawingKind | undefined;
  /** Explicit shape geometry used by preview and commit. */
  readonly geometry?: DrawingShapeGeometry | undefined;
  /** Default document-space extent used when the gesture remains a click. */
  readonly defaultExtent?: Readonly<{ width: number; height: number }> | undefined;
  /** Optional deterministic object identity supplied by a host or test. */
  readonly objectId?: string | undefined;
  /** Optional deterministic drawing identity supplied by a host or test. */
  readonly drawingId?: string | undefined;
  /** Optional deterministic rich-story identity supplied by a host or test. */
  readonly storyId?: string | undefined;
}

/** Normalized pointer event delivered to the mounted drawing creation tool. */
export interface MountedDrawingCreationPointerEvent {
  /** Captured pointer lifecycle phase. */
  readonly phase: "start" | "update" | "end" | "cancel";
  /** Browser pointer identity. */
  readonly pointerId: number;
  /** CSS-client point used for click-versus-drag threshold measurement. */
  readonly clientPoint: QuirePoint;
  /** Document-space point used for creation geometry. */
  readonly point: QuirePoint;
  /** Current Shift constraint state from pointer or keyboard input. */
  readonly shiftKey?: boolean | undefined;
  /** Body insertion position resolved when the gesture begins. */
  readonly anchorPosition?: number | undefined;
}

/** Stable identities emitted after one text-box creation command succeeds. */
export interface MountedDrawingCreatedTextBox {
  /** Stable source anchor identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Stable independently editable story identity. */
  readonly storyId: string;
}

/** Options used to create one mounted drawing interaction runtime. */
export interface CreateMountedDrawingInteractionRuntimeOptions {
  /** Editor that owns the current source document and Word commands. */
  readonly editor: QuireEditor;
  /** Mounted view status controlling mutation authority. */
  readonly status: QuireEditorViewStatus;
  /** Reads the latest retained snapshot used by pointer hit testing. */
  readonly getInteractionSnapshot: () => QuireRetainedLayoutSnapshot | undefined;
  /** Presents active transient chrome, or restores accepted chrome when cleared. */
  readonly onPreviewChange?:
    | ((state: MountedDrawingPreviewState | null) => void)
    | undefined;
  /** Transfers a validated drawing-text session to the mounted lifecycle. */
  readonly onTextEntry?:
    | ((session: MountedDrawingTextEditingSession) => void)
    | undefined;
  /** Retains a newly created text box until its first accepted render exists. */
  readonly onTextBoxCreated?:
    | ((textBox: MountedDrawingCreatedTextBox) => void)
    | undefined;
}

/** Mounted session for one independently editable drawing text story. */
export interface MountedDrawingTextEditingSession {
  /** Stable source anchor identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Stable referenced rich-text story identity. */
  readonly storyId: string;
  /** Exact position immediately before the source anchor node. */
  readonly anchorPosition: number;
  /** Editable retained story target installed for command routing. */
  readonly interactionTarget: QuireInteractionSelectionTarget;
}

/** Runtime that owns transient drawing-controller state for one mount. */
export interface MountedDrawingInteractionRuntime {
  /** Handles one selected drawing manipulation action. */
  readonly handle: QuireViewEventHandler<unknown, QuireDrawingManipulationEventPayload>;
  /** Handles one selected drawing text-entry action. */
  readonly enterText: QuireViewEventHandler<unknown, QuireDrawingEnterTextEventPayload>;
  /** Enters text from exact selected-object contextual chrome. */
  enterSelectedText(): boolean;
  /**
   * Resolves the text-box editing session owning a document position.
   *
   * @param position - Position inside a text-box story.
   * @returns Session to activate, or undefined when no laid-out text box owns it.
   */
  resolveTextStoryAt(position: number): MountedDrawingTextEditingSession | undefined;
  /** Reads current transient controller state for diagnostics and tests. */
  getState(): QuireDrawingControllerState;
  /**
   * Arms one one-shot drawing creation tool.
   *
   * @param options - Drawing family, default extent, and optional identities.
   * @returns Whether the editable primary view accepted the tool.
   */
  armCreation(options?: MountedDrawingCreationOptions): boolean;
  /**
   * Handles one normalized pointer phase while creation is armed or captured.
   *
   * @param event - Shared client/document pointer facts.
   * @returns Whether drawing creation consumed the event.
   */
  handleCreationPointer(event: MountedDrawingCreationPointerEvent): boolean;
  /** Refreshes an active creation preview when Shift changes without pointer movement. */
  updateCreationModifiers(shiftKey: boolean): boolean;
  /**
   * Cancels an armed or captured creation tool without mutating source state.
   *
   * @returns Whether creation state was active and is now cleared.
   */
  cancelCreation(): boolean;
  /** Cancels an active captured manipulation. @returns Whether capture was cleared. */
  cancelManipulation(): boolean;
  /** @param shiftKey - Current constraint key. @returns Whether a captured endpoint was updated. */
  updateManipulationModifiers(shiftKey: boolean): boolean;
  /**
   * Reports whether a creation tool is armed or owns pointer capture.
   *
   * @returns Whether creation can consume pointer input.
   */
  isCreationActive(): boolean;
  /** Discards active capture state without mutating the source document. */
  destroy(): void;
}

/** Registered drawing interaction plus event-handler registration cleanup. */
export interface RegisteredMountedDrawingInteraction {
  /** Mounted controller runtime shared by handlers and pointer creation. */
  readonly runtime: MountedDrawingInteractionRuntime;
  /** Removes registered handlers and destroys transient state. */
  readonly cleanup: () => void;
}

/** Options used to register the built-in drawing handler on one view scope. */
export interface RegisterMountedDrawingInteractionOptions
  extends CreateMountedDrawingInteractionRuntimeOptions {
  /** Mounted renderer-neutral event scope. */
  readonly scope: QuireViewScope<unknown>;
}

/** Options used to mount selected-object contextual command chrome. */
export interface CreateMountedDrawingContextualCommandsControllerOptions {
  /** Editor owning exact Word drawing selection and commands. */
  readonly editor: QuireEditor;
  /** Mounted view status controlling mutation authority. */
  readonly status: QuireEditorViewStatus;
  /** DOM host sharing document-space projection with drawing paint. */
  readonly overlayHost: HTMLElement;
  /** Reads the latest retained snapshot carrying selected-object geometry. */
  readonly getInteractionSnapshot: () => QuireRetainedLayoutSnapshot | undefined;
  /** Whether another interaction temporarily owns all drawing chrome. */
  readonly isSuppressed?: (() => boolean) | undefined;
  /** Enters the exact selected text-box story. */
  readonly onEnterText: () => boolean;
  /** Updates the exact selected drawing attrs through a Word command. */
  readonly onAttrsChange: (
    patch: DrawingAnchorPatch,
    anchorPosition: number
  ) => boolean;
  /** Deletes the exact selected object through its Word command. */
  readonly onDelete: (anchorPosition: number) => boolean;
}

/** Mounted lifecycle for selected-object contextual command chrome. */
export interface MountedDrawingContextualCommandsController {
  /** Reprojects or removes the command card from current retained state. */
  refresh(): boolean;
  /** Removes mounted chrome and releases controller state. */
  destroy(): void;
}
