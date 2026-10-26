import type { QuireEditorInputBinding } from "../../../input";
import type {
  QuireClientPoint,
  QuireClientRect,
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import type {
  MountedDrawingCreationPointerEvent,
  MountedHeaderFooterPointerSelectionPreparation,
  MountedPointerSelectionRenderMode,
  MountedWidgetEventRuntime
} from "../../shared";
import type {
  SvgMountedView,
  SvgMountedViewElements,
  SvgMountedViewRuntimeOptions
} from "../types";
import type { SvgMountedRenderSurfaceState } from "../surface";

/** Current render state required by mounted SVG pointer event handlers. */
export interface SvgMountedPointerRenderState {
  /** Latest render result with layout and selection geometry. */
  readonly renderResult: QuireViewRenderResult;
  /** Current SVG surface state. */
  readonly surfaceState: SvgMountedRenderSurfaceState;
}

/** Inputs used to hit-test mounted SVG pointer coordinates. */
export interface SvgMountedPointerHitTestRequest {
  /** Pointer client point to resolve. */
  readonly clientPoint: QuireClientPoint;
  /** Current render state used for layout and SVG text roots. */
  readonly renderState: SvgMountedPointerRenderState;
  /** Client rectangle of the mounted SVG coordinate surface. */
  readonly surfaceClientRect: QuireClientRect;
}

/** Options used to bind mounted SVG pointer events. */
export interface BindSvgMountedPointerEventsOptions {
  /** Mounted editor view receiving pointer input. */
  readonly mountedView: SvgMountedView;
  /** Elements owned by the mounted SVG view. */
  readonly elements: SvgMountedViewElements;
  /** Widget event runtime used to dispatch renderer target events. */
  readonly widgetEvents: MountedWidgetEventRuntime;
  /** Optional runtime callbacks and display-list styles. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
  /**
   * Reads the latest render state.
   *
   * @returns Current render state, or null before the first render.
   */
  readonly getRenderState: () => SvgMountedPointerRenderState | null;
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
   * Resolves a pointer hit-test through SVG-owned geometry.
   *
   * @param request - Pointer point, render state, and coordinate surface.
   * @returns Hit-test result for the pointer point.
   */
  readonly hitTestPointer: (
    request: SvgMountedPointerHitTestRequest
  ) => QuireHitTestResult;
  /**
   * Emits pointer hit-test diagnostics.
   *
   * @param hitTestResult - Latest pointer hit-test result.
   */
  readonly onPointerHitTest: (hitTestResult: QuireHitTestResult) => void;
}
