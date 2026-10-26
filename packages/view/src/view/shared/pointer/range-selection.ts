import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import { quireNeutralDocumentProfile, type QuireLayoutSnapshot } from "@quirekit/view-engine";
import type {
  QuireViewPointerHitTestResult,
  QuireViewPointerRangeSelectionResult,
  QuireViewPointerSelectionOptions
} from "../../types";
import { selectQuireViewPointerRangeHits } from "../../facade/pointer";
import {
  resolveMountedSelectionBetween,
  resolveMountedSelectionRangeEndpointTargets
} from "../selection";
import type { QuireMountedEditorView } from "../types";
import { createMountedPointerSelectionOptions } from "./selection-options";
import { resolveMountedPointerPolicyDecision } from "./policy";
import { constrainMountedSelectionScopeDragHeadHit } from "./session/story-selection";

/** Endpoint hits produced for a mounted pointer drag range. */
export interface MountedPointerRangeEndpointHits {
  /** Hit-test result for the fixed drag anchor. */
  readonly anchorHitTestResult: QuireHitTestResult;
  /** Hit-test result for the moving drag head. */
  readonly headHitTestResult: QuireHitTestResult;
  /** Retained interaction target resolved with the moving drag head. */
  readonly headInteractionTarget: QuireInteractionSelectionTarget | null;
}

/** Shared inputs used to resolve mounted drag endpoint hits. */
export interface ResolveMountedPointerRangeEndpointHitsBaseOptions {
  /**
   * Backend hit-test capability used only to produce endpoint facts.
   *
   * @param options - Single pointer endpoint hit-test options.
   * @returns Endpoint hit-test result with retained target facts.
   */
  readonly hitTestPointer: (
    options: QuireViewPointerSelectionOptions
  ) => QuireViewPointerHitTestResult;
  /** Browser client point that becomes the moving selection head. */
  readonly headClientPoint: QuireViewPointerSelectionOptions["clientPoint"];
  /** Mounted coordinate surface client rectangle. */
  readonly canvasClientRect: QuireViewPointerSelectionOptions["canvasClientRect"];
  /** Document-space bounds the coordinate surface maps onto, when known. */
  readonly surfaceBounds?: QuireViewPointerSelectionOptions["surfaceBounds"];
  /** Geometry snapshot already produced by the mounted render pass. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
}

/** Inputs used after the drag anchor was resolved at pointer down. */
export interface ResolveMountedPointerRangeEndpointHitsOptions
  extends ResolveMountedPointerRangeEndpointHitsBaseOptions {
  /** Logical hit-test result that anchors the drag selection. */
  readonly anchorHitTestResult: QuireHitTestResult;
}

/** Options used to apply mounted drag range hits to shared selection semantics. */
export interface ApplyMountedPointerRangeSelectionOptions
  extends MountedPointerRangeEndpointHits {
  /** Mounted view that owns the PM state, dispatch, and selection-between hooks. */
  readonly mountedView: QuireMountedEditorView;
  /** Geometry snapshot that produced the endpoint hits. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /**
   * Stores the interaction target that should route subsequent input commands.
   *
   * @param target - Active endpoint interaction target, or null when no target was resolved.
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
   * Emits pointer hit-test diagnostics.
   *
   * @param hitTestResult - Latest pointer head hit-test result.
   */
  readonly onPointerHitTest: (hitTestResult: QuireHitTestResult) => void;
  /** Requests a selection render pass after pointer selection changes. */
  readonly renderSelection: () => void;
}

/**
 * Resolves Canvas/HTML drag endpoint hits without applying selection semantics.
 *
 * @param options - Mounted drag endpoint points and backend hit-test capability.
 * @returns Resolved endpoint hit facts for shared range selection.
 */
export function resolveMountedPointerRangeEndpointHits(
  options: ResolveMountedPointerRangeEndpointHitsOptions
): MountedPointerRangeEndpointHits {
  const headHit = options.hitTestPointer(
    createMountedPointerSelectionOptions({
      geometrySnapshot: options.geometrySnapshot,
      clientPoint: options.headClientPoint,
      canvasClientRect: options.canvasClientRect,
      surfaceBounds: options.surfaceBounds
    })
  );

  return {
    anchorHitTestResult: options.anchorHitTestResult,
    headHitTestResult: headHit.hitTestResult,
    headInteractionTarget: headHit.interactionTarget
  };
}

/**
 * Applies mounted pointer drag endpoint hits through shared selection semantics.
 *
 * @param options - Mounted view, endpoint hits, geometry context hooks, and render hooks.
 * @returns Pointer range selection result produced by shared selection semantics.
 */
export function applyMountedPointerRangeSelection(
  options: ApplyMountedPointerRangeSelectionOptions
): QuireViewPointerRangeSelectionResult {
  options.onPointerHitTest(options.headHitTestResult);

  // Missing geometry and retained controls cannot replace a valid drag head.
  // Reject them before scope normalization can fall back to the fixed anchor,
  // preserving both the last range and the input/paint ownership during scroll.
  if (!shouldAcceptMountedPointerRangeHead(options)) {
    return {
      geometrySnapshot: options.geometrySnapshot,
      anchorHitTestResult: options.anchorHitTestResult,
      headHitTestResult: options.headHitTestResult,
      updated: false
    };
  }

  const acceptedHeadHitTestResult = constrainMountedSelectionScopeDragHeadHit({
    doc: options.mountedView.state.doc,
    selection: options.mountedView.state.selection,
    geometrySnapshot: options.geometrySnapshot,
    anchorHitTestResult: options.anchorHitTestResult,
    headHitTestResult: options.headHitTestResult,
    pageModel: (options.geometrySnapshot?.documentProfile ?? quireNeutralDocumentProfile).pageModel
  });
  const result = selectQuireViewPointerRangeHits({
    state: options.mountedView.state,
    dispatchTransaction: (transaction) =>
      options.mountedView.dispatch(transaction),
    geometrySnapshot: options.geometrySnapshot,
    anchorHitTestResult: options.anchorHitTestResult,
    headHitTestResult: acceptedHeadHitTestResult,
    createSelectionBetween: (anchor, head) =>
      resolveMountedSelectionBetween(options.mountedView, anchor, head)
  });
  const endpointTargets = resolveMountedSelectionRangeEndpointTargets({
    anchorHitTestResult: result.anchorHitTestResult,
    headHitTestResult: result.headHitTestResult
  });

  options.setInteractionTarget(endpointTargets.headTarget);
  options.setSelectionGeometryContext(endpointTargets.selectionContext);

  if (result.updated) {
    options.renderSelection();
  }

  return result;
}

/**
 * Resolves whether one retained moving endpoint may update a text drag range.
 *
 * Only actual positions can continue a drag. Retained targets must also opt
 * into selection through the same mounted policy used by pointer down.
 *
 * @param options - Mounted view status and moving endpoint target facts.
 * @returns Whether the moving endpoint may replace the current text drag head.
 */
function shouldAcceptMountedPointerRangeHead(
  options: ApplyMountedPointerRangeSelectionOptions
): boolean {
  return options.headHitTestResult.kind !== "miss" && (options.headInteractionTarget === null
    || resolveMountedPointerPolicyDecision({
      status: options.mountedView.status,
      interactionTarget: options.headInteractionTarget
    }).shouldStartSelection);
}
