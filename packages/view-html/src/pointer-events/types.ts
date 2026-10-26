import type { QuireEditorInputBinding } from "@quirekit/view/mounted-backend";
import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import type { HtmlFlowRenderResult } from "../geometry";
import type {
  MountedHeaderFooterPointerSelectionPreparation,
  MountedPointerSelectionRenderMode,
  MountedWidgetEventRuntime
} from "@quirekit/view/mounted-backend";
import type {
  HtmlMountedView,
  HtmlMountedViewElements,
  HtmlMountedViewRuntimeOptions
} from "../types";
import type { HtmlMountedRenderSurfaceState } from "../surface";
import type { HtmlDomMeasurementProvider } from "../measurement";

/** Current render state required by mounted HTML pointer event handlers. */
export interface HtmlMountedPointerRenderState {
  /** Latest render result with layout and selection geometry. */
  readonly renderResult: HtmlFlowRenderResult;
  /** Current HTML surface state. */
  readonly surfaceState: HtmlMountedRenderSurfaceState;
}

/** Options used to bind mounted HTML pointer events. */
export interface BindHtmlMountedPointerEventsOptions {
  /** Mounted editor view receiving pointer input. */
  readonly mountedView: HtmlMountedView;
  /** Elements owned by the mounted HTML view. */
  readonly elements: HtmlMountedViewElements;
  /** Widget event runtime used to dispatch renderer target events. */
  readonly widgetEvents: MountedWidgetEventRuntime;
  /** Retained DOM measurement authority used for browser pointer mapping. */
  readonly measurementProvider: HtmlDomMeasurementProvider;
  /** Optional runtime callbacks and display-list styles. */
  readonly runtime?: HtmlMountedViewRuntimeOptions | undefined;
  /**
   * Reads the latest render state.
   *
   * @returns Current render state, or null before the first render.
   */
  readonly getRenderState: () => HtmlMountedPointerRenderState | null;
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
   * Routes native events through retained custom-view ownership.
   *
   * @param event - Native event to classify.
   * @returns Whether a custom NodeView stopped editor handling.
   */
  readonly stopEvent: (event: Event) => boolean;
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
  /**
   * Emits pointer hit-test diagnostics.
   *
   * @param hitTestResult - Latest pointer hit-test result.
   */
  readonly onPointerHitTest: (hitTestResult: QuireHitTestResult) => void;
}
