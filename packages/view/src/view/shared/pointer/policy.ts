import type { QuireRect, QuireViewDispatchResult } from "@quirekit/renderer";
import type { QuireViewPointerPolicy } from "@quirekit/view-engine";
import {
  withQuireInteractionDiagnostics
} from "@quirekit/view-engine";
import type { QuireHitTestResult } from "@quirekit/view-engine";
import type { MountedWidgetEventRuntime } from "../widget-events";
import type {
  QuireMountedPointerPolicyDecision,
  ResolveMountedPointerPolicyDecisionOptions
} from "./types";
import {
  defaultSelectionPointerPolicy,
  resolveMountedTargetPointerPolicy
} from "./policy-defaults";

/**
 * Resolves the shared mounted pointer policy for one pointerdown event.
 *
 * @param options - View status, widget dispatch results, and optional retained target.
 * @returns Pointer policy decision consumed by mounted backend pointer handlers.
 */
export function resolveMountedPointerPolicyDecision(
  options: ResolveMountedPointerPolicyDecisionOptions
): QuireMountedPointerPolicyDecision {
  if (
    options.pointerDispatch?.defaultPrevented === true ||
    options.clickDispatch?.defaultPrevented === true
  ) {
    return {
      kind: "widget-dispatch",
      shouldFocusEditor: true,
      shouldRunPluginClickProps: false,
      shouldStartSelection: false,
      shouldCapturePointer: false,
      shouldKeepInteractionTarget: false
    };
  }

  if (options.status === "lock") {
    return {
      kind: "locked-hit-test",
      shouldFocusEditor: false,
      shouldRunPluginClickProps: false,
      shouldStartSelection: false,
      shouldCapturePointer: false,
      shouldKeepInteractionTarget: false
    };
  }

  if (options.interactionTarget === null) {
    return {
      kind: "pass-through",
      shouldFocusEditor: false,
      shouldRunPluginClickProps: false,
      shouldStartSelection: false,
      shouldCapturePointer: false,
      shouldKeepInteractionTarget: false
    };
  }

  const pointerPolicy = resolveMountedTargetPointerPolicy(
    options.interactionTarget
  );

  switch (pointerPolicy.kind) {
    case "dispatch":
      return createMountedPointerPolicyDecision({
        kind: "target-dispatch",
        pointerPolicy,
        defaultFocusEditor: true,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false,
        shouldCapturePointer: false,
        shouldKeepInteractionTarget: true
      });
    case "pass-through":
      return createMountedPointerPolicyDecision({
        kind: "pass-through",
        pointerPolicy,
        defaultFocusEditor: false,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false,
        shouldCapturePointer: false,
        shouldKeepInteractionTarget: false
      });
    case "focus-only":
      return createMountedPointerPolicyDecision({
        kind: "focus-only",
        pointerPolicy,
        defaultFocusEditor: true,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false,
        shouldCapturePointer: false,
        shouldKeepInteractionTarget: true
      });
    case "select":
      return createMountedPointerPolicyDecision({
        kind: "selection",
        pointerPolicy,
        defaultFocusEditor: true,
        shouldRunPluginClickProps: true,
        shouldStartSelection: true,
        shouldCapturePointer: true,
        shouldKeepInteractionTarget: true
      });
    default:
      return createMountedPointerPolicyDecision({
        kind: "selection",
        pointerPolicy: defaultSelectionPointerPolicy,
        defaultFocusEditor: true,
        shouldRunPluginClickProps: true,
        shouldStartSelection: true,
        shouldCapturePointer: true,
        shouldKeepInteractionTarget: true
      });
  }
}

/**
 * Dispatches qkView pointer events after a retained dispatch target has been hit.
 *
 * @param options - Widget runtime, native event, click count, and mounted surface.
 */
export function dispatchMountedRetainedPointerTargetEvents(options: {
  /** Runtime that owns qkView target event dispatch. */
  readonly widgetEvents: MountedWidgetEventRuntime;
  /** Browser pointer event being handled. */
  readonly event: PointerEvent;
  /** Normalized click count for the pointerdown sequence. */
  readonly clickCount: number;
  /** Mounted coordinate surface bounds in client coordinates. */
  readonly surfaceClientRect: DOMRect;
  /** Exact document-space bounds represented by the mounted surface. */
  readonly surfaceBounds: QuireRect;
}): QuireViewDispatchResult {
  const pointerDownResult = options.widgetEvents.dispatchPointerEvent({
    type: "pointerDown",
    pointerId: options.event.pointerId,
    clientPoint: options.event,
    surfaceClientRect: options.surfaceClientRect,
    surfaceBounds: options.surfaceBounds,
    nativeEvent: options.event
  });

  if (pointerDownResult.pointerCaptureRequested) {
    return pointerDownResult;
  }

  const clickResult = options.widgetEvents.dispatchPointerEvent({
    type: "click",
    pointerId: options.event.pointerId,
    clientPoint: options.event,
    surfaceClientRect: options.surfaceClientRect,
    surfaceBounds: options.surfaceBounds,
    nativeEvent: options.event
  });

  if (options.clickCount !== 2) {
    return clickResult;
  }

  // Match the browser event sequence: the second activation is still a click,
  // then it additionally emits doubleClick. Replacing click would make atomic
  // controls ignore every second rapid activation when they only bind click.
  const doubleClickResult = options.widgetEvents.dispatchPointerEvent({
    type: "doubleClick",
    pointerId: options.event.pointerId,
    clientPoint: options.event,
    surfaceClientRect: options.surfaceClientRect,
    surfaceBounds: options.surfaceBounds,
    nativeEvent: options.event
  });
  return mergeMountedPointerDispatchResults(clickResult, doubleClickResult);
}

/**
 * Merges sequential retained-target dispatch results without losing ownership.
 *
 * @param first - Result of the ordinary click dispatch.
 * @param second - Result of the additional double-click dispatch.
 * @returns Combined cancellation and capture facts from both dispatches.
 */
function mergeMountedPointerDispatchResults(
  first: QuireViewDispatchResult,
  second: QuireViewDispatchResult
): QuireViewDispatchResult {
  return {
    handled: first.handled || second.handled,
    defaultPrevented: first.defaultPrevented || second.defaultPrevented,
    pointerCaptureRequested:
      first.pointerCaptureRequested || second.pointerCaptureRequested
  };
}

/**
 * Adds mounted pointer-policy decision diagnostics to a hit-test result.
 *
 * @param hitTestResult - Pointer hit-test result to enrich.
 * @param decision - Mounted pointer-policy decision resolved for the hit.
 * @returns Hit-test result carrying pointer-policy diagnostics.
 */
export function withMountedPointerPolicyDiagnostics(
  hitTestResult: QuireHitTestResult,
  decision: QuireMountedPointerPolicyDecision
): QuireHitTestResult {
  return withQuireInteractionDiagnostics(hitTestResult, {
    pointerDecision: {
      decision: decision.kind,
      ...(decision.pointerPolicy === undefined
        ? {}
        : { pointerPolicy: decision.pointerPolicy }),
      passThrough: decision.kind === "pass-through"
    }
  });
}

/**
 * Creates a mounted pointer policy decision from shared boolean facts.
 *
 * @param options - Decision kind, retained policy, and behavior flags.
 * @returns Mounted pointer policy decision.
 */
function createMountedPointerPolicyDecision(options: {
  readonly kind: QuireMountedPointerPolicyDecision["kind"];
  readonly pointerPolicy: QuireViewPointerPolicy;
  readonly defaultFocusEditor: boolean;
  readonly shouldRunPluginClickProps: boolean;
  readonly shouldStartSelection: boolean;
  readonly shouldCapturePointer: boolean;
  readonly shouldKeepInteractionTarget: boolean;
}): QuireMountedPointerPolicyDecision {
  return {
    kind: options.kind,
    pointerPolicy: options.pointerPolicy,
    shouldFocusEditor:
      options.pointerPolicy.shouldFocusEditor ?? options.defaultFocusEditor,
    shouldRunPluginClickProps: options.shouldRunPluginClickProps,
    shouldStartSelection: options.shouldStartSelection,
    shouldCapturePointer: options.shouldCapturePointer,
    shouldKeepInteractionTarget: options.shouldKeepInteractionTarget
  };
}
