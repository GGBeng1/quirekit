import type { QuireEditorInputBinding } from "../../../input";
import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import type { QuireView } from "../../facade";
import type { QuireViewRenderResult } from "../../types";
import type {
  MountedDrawingCreationPointerEvent,
  MountedHeaderFooterPointerSelectionPreparation,
  MountedPointerSelectionRenderMode,
  MountedWidgetEventRuntime
} from "../../shared";
import type {
  CanvasMountedView,
  CanvasMountedViewElements,
  CanvasMountedViewRuntimeOptions
} from "../types";
import type { CanvasMountedRenderSurfaceState } from "../surface";

/** Current render state required by mounted pointer event handlers. */
export interface CanvasMountedPointerRenderState {
  /** Latest render result with layout and selection geometry. */
  readonly renderResult: QuireViewRenderResult;
  /** Current canvas surface state. */
  readonly surfaceState: CanvasMountedRenderSurfaceState;
}

/** Options used to bind mounted canvas pointer events. */
export interface BindCanvasMountedPointerEventsOptions {
  /** Mounted editor view receiving pointer input. */
  readonly mountedView: CanvasMountedView;
  /** Canvas view facade used for hit testing and selection updates. */
  readonly canvasView: QuireView;
  /** Elements owned by the mounted canvas view. */
  readonly elements: CanvasMountedViewElements;
  /** Widget event runtime used to dispatch renderer target events. */
  readonly widgetEvents: MountedWidgetEventRuntime;
  /** Optional runtime callbacks and display-list styles. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
  /**
   * Reads the latest render state.
   *
   * @returns Current render state, or null before the first render.
   */
  readonly getRenderState: () => CanvasMountedPointerRenderState | null;
  /**
   * Reads the current input binding.
   *
   * @returns Mounted input binding when this view is editable.
   */
  readonly getInputBinding: () => QuireEditorInputBinding | undefined;
  /**
   * Reads the interaction target currently routing input commands.
   *
   * @returns Active target, or null before pointer ownership is established.
   */
  readonly getInteractionTarget: () => QuireInteractionSelectionTarget | null;
  /** Focuses the mounted view input target. */
  readonly focus: () => void;
  /**
   * Synchronizes selection presentation through a new request or pending transaction.
   *
   * @param mode - Whether to request local work or flush transaction-owned work.
   */
  readonly renderSelection: (mode: MountedPointerSelectionRenderMode) => void;
  /**
   * Stores the interaction target that should route subsequent input commands.
   *
   * @param target - Active interaction target, or null when the pointer selection missed.
   */
  readonly setInteractionTarget: (
    target: QuireInteractionSelectionTarget | null
  ) => void;
  /**
   * Stores retained geometry context used to filter selection/caret visuals.
   *
   * @param context - Active geometry context, or undefined without retained facts.
   */
  readonly setSelectionGeometryContext: (
    context: QuireSelectionGeometryContext | undefined
  ) => void;
  /**
   * Gates pointer selection through explicit header/footer editing ownership.
   *
   * @param target - Retained target produced by hit testing.
   * @param clickCount - Normalized consecutive pointer click count.
   * @returns Whether the gesture is blocked, allowed, or changes editing domain.
   */
  readonly prepareHeaderFooterPointerSelection?:
    | ((
        target: QuireInteractionSelectionTarget | null,
        clickCount: number
      ) => MountedHeaderFooterPointerSelectionPreparation)
    | undefined;
  /** Routes an armed drawing creation gesture before ordinary selection. */
  readonly handleDrawingCreationPointer?:
    | ((event: MountedDrawingCreationPointerEvent) => boolean)
    | undefined;
  /**
   * Reports whether drawing creation owns the current cursor.
   *
   * @returns Whether a creation tool is armed or captured.
   */
  readonly isDrawingCreationActive?: (() => boolean) | undefined;
  /**
   * Emits pointer hit-test diagnostics.
   *
   * @param hitTestResult - Latest pointer hit-test result.
   */
  readonly onPointerHitTest: (hitTestResult: QuireHitTestResult) => void;
}
