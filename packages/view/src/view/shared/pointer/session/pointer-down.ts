import type { Transaction } from "@quirekit/pm";
import {
  mapClientPointToQuirePoint,
  quireNeutralDocumentProfile,
  resolveQuireHitTestSelectionTarget
} from "@quirekit/view-engine";

import {
  selectQuireViewPointerExpandedHit,
  selectQuireViewPointerHit,
  selectQuireViewPointerHitFromSelectionAnchor
} from "../../../facade/pointer";
import {
  createMountedSelectionAnchorHitTestResult,
  createMountedSelectionGeometryContext,
  createMountedSelectionRangeGeometryContextFromVisualContexts,
  resolveMountedSelectionAnchorVisualContext,
  resolveMountedSelectionBetween
} from "../../selection";
import { clearMountedNativeSelection, trySetMountedPointerCapture } from "../dom";
import { synchronizeMountedPointerInput } from "../input-session";
import {
  dispatchMountedRetainedPointerTargetEvents,
  resolveMountedPointerPolicyDecision,
  withMountedPointerPolicyDiagnostics
} from "../policy";
import { dispatchMountedPointerClickProps } from "../props";
import { createMountedPointerSelectionOptions } from "../selection-options";
import { shouldStartMountedPointerSelection } from "../start";
import {
  constrainMountedSelectionScopePointerHit,
  isMountedHeaderFooterSelectionTarget,
  isMountedPointerHitOwnedBySelectionTarget
} from "./story-selection";
import type { HandleMountedPointerDownOptions } from "./types";

/**
 * Applies pointerdown semantics shared by Canvas, SVG, and HTML mounted views.
 *
 * Backend adapters provide only a coordinate surface and a hit-test capability.
 * Policy, plugin props, click expansion, shift anchoring, capture, focus, and
 * retained selection context are therefore resolved once for every backend.
 *
 * @param options - Pointer event, render products, and mounted session hooks.
 */
export function handleMountedPointerDown(
  options: HandleMountedPointerDownOptions
): void {
  const { bindingOptions, clickCount, event, renderState } = options;

  if (!shouldStartMountedPointerSelection(event)) {
    event.preventDefault();
    return;
  }

  const surfaceClientRect = bindingOptions.coordinateSurface.getBoundingClientRect();
  const surfaceBounds = renderState.surfaceState.surfaceBounds;
  const pointerPoint = mapClientPointToQuirePoint({
    clientPoint: event,
    canvasClientRect: surfaceClientRect,
    surfaceBounds
  });
  if (bindingOptions.handleDrawingCreationPointer?.({
    phase: "start",
    shiftKey: event.shiftKey,
    pointerId: event.pointerId,
    clientPoint: event,
    point: pointerPoint,
    anchorPosition: bindingOptions.mountedView.state.selection.from
  }) === true) {
    event.preventDefault();
    clearMountedNativeSelection(bindingOptions.root.ownerDocument);
    options.setPointerDragState({
      kind: "drawing-creation",
      pointerId: event.pointerId
    });
    trySetMountedPointerCapture(bindingOptions.coordinateSurface, event.pointerId);
    return;
  }

  event.preventDefault();
  clearMountedNativeSelection(bindingOptions.root.ownerDocument);

  const pointerHit = bindingOptions.hitTestPointer(
    createMountedPointerSelectionOptions({
      geometrySnapshot: renderState.renderResult.interactionSnapshot,
      clientPoint: event,
      canvasClientRect: surfaceClientRect,
      surfaceBounds
    }),
    renderState
  );
  const hitTestResult = pointerHit.hitTestResult;
  const preHitPolicyDecision = resolveMountedPointerPolicyDecision({
    status: bindingOptions.mountedView.status
  });

  if (preHitPolicyDecision.kind === "locked-hit-test") {
    bindingOptions.onPointerHitTest(
      withMountedPointerPolicyDiagnostics(hitTestResult, preHitPolicyDecision)
    );
    return;
  }

  const policyDecision = resolveMountedPointerPolicyDecision({
    status: bindingOptions.mountedView.status,
    interactionTarget: pointerHit.interactionTarget
  });

  if (!isMountedPointerHitOwnedBySelectionTarget(
    pointerHit.interactionTarget,
    hitTestResult
  )) {
    bindingOptions.prepareHeaderFooterPointerSelection?.(null, clickCount);
    bindingOptions.setInteractionTarget(null);
    bindingOptions.setSelectionGeometryContext(undefined);
    bindingOptions.onPointerHitTest(
      withMountedPointerPolicyDiagnostics(hitTestResult, policyDecision)
    );
    bindingOptions.renderSelection("request");
    return;
  }

  const headerFooterPreparation =
    bindingOptions.prepareHeaderFooterPointerSelection?.(
      pointerHit.interactionTarget,
      clickCount
    ) ?? "allow";

  if (headerFooterPreparation === "block") {
    bindingOptions.setInteractionTarget(null);
    bindingOptions.setSelectionGeometryContext(undefined);
    bindingOptions.onPointerHitTest(
      withMountedPointerPolicyDiagnostics(hitTestResult, policyDecision)
    );
    bindingOptions.renderSelection("request");
    return;
  }

  synchronizeMountedPointerInput({
    inputBinding: bindingOptions.getInputBinding(),
    decision: policyDecision,
    pointerType: event.pointerType
  });

  if (!policyDecision.shouldStartSelection) {
    let pointerCaptureRequested = false;
    const interactionTargetBeforeDispatch =
      bindingOptions.getInteractionTarget();

    if (
      policyDecision.kind === "target-dispatch" ||
      policyDecision.kind === "focus-only"
    ) {
      pointerCaptureRequested = dispatchMountedRetainedPointerTargetEvents({
        widgetEvents: bindingOptions.widgetEvents,
        event,
        clickCount,
        surfaceClientRect,
        surfaceBounds
      }).pointerCaptureRequested;
    }

    if (pointerCaptureRequested) {
      const captureCursor = bindingOptions.useWidgetTargetCursor === true
        ? bindingOptions.widgetEvents.hitTestPoint(pointerPoint)?.target.captureCursor
        : undefined;
      options.setPointerDragState({
        kind: "target-capture",
        pointerId: event.pointerId,
        ...(captureCursor === undefined ? {} : { captureCursor })
      });
      trySetMountedPointerCapture(bindingOptions.coordinateSurface, event.pointerId);
    }

    // A retained action may transfer ownership to a nested editor, such as a
    // drawing-text story. Preserve that post-action target instead of writing
    // the original object hit back over the newly installed command boundary.
    if (bindingOptions.getInteractionTarget() === interactionTargetBeforeDispatch) {
      bindingOptions.setInteractionTarget(
        policyDecision.shouldKeepInteractionTarget
          ? pointerHit.interactionTarget
          : null
      );
    }
    bindingOptions.onPointerHitTest(
      withMountedPointerPolicyDiagnostics(hitTestResult, policyDecision)
    );

    if (policyDecision.shouldFocusEditor) {
      bindingOptions.focus();
    }

    return;
  }

  // The canonical body layout may retain the complete PM source range for
  // geometry. Normalize blank fallbacks before they can become a selection or
  // fixed drag anchor so hidden story storage never widens this gesture.
  const selectionHitTestResult = constrainMountedSelectionScopePointerHit({
    doc: bindingOptions.mountedView.state.doc,
    selection: bindingOptions.mountedView.state.selection,
    hitTestResult,
    pageModel: (renderState.renderResult.layoutSnapshot.documentProfile ?? quireNeutralDocumentProfile).pageModel
  });

  if (
    headerFooterPreparation !== "transition" &&
    policyDecision.shouldRunPluginClickProps &&
    selectionHitTestResult.kind !== "miss" &&
    dispatchMountedPointerClickProps(
      bindingOptions.mountedView,
      selectionHitTestResult.position.pos,
      selectionHitTestResult.inside,
      event,
      clickCount
    )
  ) {
    bindingOptions.setInteractionTarget(pointerHit.interactionTarget);
    bindingOptions.onPointerHitTest(
      withMountedPointerPolicyDiagnostics(selectionHitTestResult, policyDecision)
    );
    bindingOptions.focus();
    return;
  }

  // Capture anchor facts before dispatch mutates the PM selection. Shift-click
  // and shift-drag must continue from this stable visual instance across pages.
  const extendFromSelectionAnchor = clickCount === 1 && event.shiftKey === true;
  const selectionBeforePointerDown = bindingOptions.mountedView.state.selection;
  const anchorVisualContext = extendFromSelectionAnchor
    ? resolveMountedSelectionAnchorVisualContext({
        selection: selectionBeforePointerDown,
        selectionGeometry: renderState.renderResult.selectionGeometry,
        ...(renderState.renderResult.selectionContext === undefined
          ? {}
          : { selectionContext: renderState.renderResult.selectionContext })
      })
    : undefined;
  const nextInteractionTarget = resolveQuireHitTestSelectionTarget({
    hitTestResult: selectionHitTestResult
  });
  const nextSelectionGeometryContext = extendFromSelectionAnchor
    ? createMountedSelectionRangeGeometryContextFromVisualContexts(
        anchorVisualContext,
        createMountedSelectionGeometryContext(nextInteractionTarget)
      )
    : createMountedSelectionGeometryContext(nextInteractionTarget);
  let installedSelectionContext = false;

  /**
   * Publishes retained pointer context before dispatch can synchronously render.
   *
   * @param transaction - Pointer selection transaction to dispatch.
   */
  const dispatchSelectionTransaction = (transaction: Transaction): void => {
    // The transaction may synchronously render when this is the first unfocused
    // click. Publish its retained owner before dispatch so that render and plugin
    // views observe the same pointer-owned geometry revision.
    bindingOptions.setInteractionTarget(nextInteractionTarget);
    bindingOptions.setSelectionGeometryContext(nextSelectionGeometryContext);
    installedSelectionContext = true;
    bindingOptions.mountedView.dispatch(transaction);
  };
  let result: ReturnType<typeof selectQuireViewPointerHit>;

  // Multi-click expansion belongs to text. Exact retained objects keep their node selection
  // after plugin/target actions have had the opportunity to enter a nested editing domain.
  const exactMultiClickTarget = clickCount >= 2
    && (nextInteractionTarget?.domain === "object" || nextInteractionTarget?.domain === "node");
  if (headerFooterPreparation === "transition" || exactMultiClickTarget) {
    result = selectQuireViewPointerHit({
      state: bindingOptions.mountedView.state,
      dispatchTransaction: dispatchSelectionTransaction,
      geometrySnapshot: pointerHit.geometrySnapshot,
      hitTestResult: selectionHitTestResult
    });
  } else if (extendFromSelectionAnchor) {
    result = selectQuireViewPointerHitFromSelectionAnchor({
      state: bindingOptions.mountedView.state,
      dispatchTransaction: dispatchSelectionTransaction,
      geometrySnapshot: pointerHit.geometrySnapshot,
      hitTestResult: selectionHitTestResult,
      createSelectionBetween: (anchor, head) =>
        resolveMountedSelectionBetween(bindingOptions.mountedView, anchor, head)
    });
  } else if (clickCount >= 3) {
    result = selectQuireViewPointerExpandedHit({
      state: bindingOptions.mountedView.state,
      dispatchTransaction: dispatchSelectionTransaction,
      geometrySnapshot: pointerHit.geometrySnapshot,
      hitTestResult: selectionHitTestResult,
      kind: "textblock"
    });
  } else if (clickCount === 2) {
    result = selectQuireViewPointerExpandedHit({
      state: bindingOptions.mountedView.state,
      dispatchTransaction: dispatchSelectionTransaction,
      geometrySnapshot: pointerHit.geometrySnapshot,
      hitTestResult: selectionHitTestResult,
      kind: "word"
    });
  } else {
    result = selectQuireViewPointerHit({
      state: bindingOptions.mountedView.state,
      dispatchTransaction: dispatchSelectionTransaction,
      geometrySnapshot: pointerHit.geometrySnapshot,
      hitTestResult: selectionHitTestResult
    });
  }

  // A double-click is also the explicit entry gesture for header/footer
  // stories. Blank story space has no word range, so preserve story ownership
  // by falling back to its exact caret instead of retaining a body selection.
  if (
    !result.updated
    && clickCount >= 2
    && isMountedHeaderFooterSelectionTarget(pointerHit.interactionTarget)
  ) {
    result = selectQuireViewPointerHit({
      state: bindingOptions.mountedView.state,
      dispatchTransaction: dispatchSelectionTransaction,
      geometrySnapshot: pointerHit.geometrySnapshot,
      hitTestResult: selectionHitTestResult
    });
  }

  if (!installedSelectionContext) {
    // Every helper derives its result target from selectionHitTestResult. Reuse
    // the retained facts computed above when selection equality skips dispatch.
    bindingOptions.setInteractionTarget(nextInteractionTarget);
    bindingOptions.setSelectionGeometryContext(nextSelectionGeometryContext);
  }
  bindingOptions.onPointerHitTest(
    withMountedPointerPolicyDiagnostics(result.hitTestResult, policyDecision)
  );

  if (result.updated) {
    bindingOptions.renderSelection("flush-pending");
  }

  const preservesExactNodeSelection =
    result.selectionDomain === "object" ||
    result.selectionDomain === "node";

  // Exact retained nodes finish selection on pointerdown. Generic range-drag
  // ownership would reinterpret an unchanged pointerup as a text caret and
  // overwrite that NodeSelection; object controls start target capture instead.
  if (clickCount < 2 && !preservesExactNodeSelection) {
    options.setPointerDragState(
      extendFromSelectionAnchor && selectionHitTestResult.kind !== "miss"
        ? {
            kind: "selection-anchor",
            pointerId: event.pointerId,
            pressClientPoint: {
              clientX: event.clientX,
              clientY: event.clientY
            },
            anchorHitTestResult: createMountedSelectionAnchorHitTestResult({
              selection: selectionBeforePointerDown,
              ...(anchorVisualContext === undefined
                ? {}
                : { visualContext: anchorVisualContext }),
              fallbackRect: selectionHitTestResult.rect
            })
          }
        : {
            kind: "selection-anchor",
            pointerId: event.pointerId,
            pressClientPoint: {
              clientX: event.clientX,
              clientY: event.clientY
            },
            anchorHitTestResult: result.hitTestResult
          }
    );

    if (policyDecision.shouldCapturePointer) {
      trySetMountedPointerCapture(bindingOptions.coordinateSurface, event.pointerId);
    }
  }

  bindingOptions.focus();
}
