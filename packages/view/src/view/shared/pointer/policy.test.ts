import type { QuireViewDispatchResult } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import type { QuireViewPointerPolicy } from "@quirekit/view-engine";
import type { MountedWidgetEventRuntime } from "../widget-events";
import {
  dispatchMountedRetainedPointerTargetEvents,
  resolveMountedPointerPolicyDecision,
  withMountedPointerPolicyDiagnostics
} from "./policy";

const emptyDispatchResult: QuireViewDispatchResult = {
  handled: false,
  defaultPrevented: false,
  pointerCaptureRequested: false
};

const preventedDispatchResult: QuireViewDispatchResult = {
  handled: true,
  defaultPrevented: true,
  pointerCaptureRequested: false
};

describe("mounted pointer policy", () => {
  it("dispatches the second retained activation as click then doubleClick", () => {
    const dispatchedTypes: string[] = [];
    const widgetEvents = {
      dispatchPointerEvent: (event: { readonly type: string }) => {
        dispatchedTypes.push(event.type);
        return event.type === "click"
          ? preventedDispatchResult
          : emptyDispatchResult;
      }
    };

    const result = dispatchMountedRetainedPointerTargetEvents({
      widgetEvents: widgetEvents as unknown as MountedWidgetEventRuntime,
      event: {
        pointerId: 7,
        clientX: 20,
        clientY: 30
      } as PointerEvent,
      clickCount: 2,
      surfaceClientRect: {
        left: 0,
        top: 0,
        width: 320,
        height: 180
      } as DOMRect,
      surfaceBounds: { x: 0, y: 0, width: 320, height: 180 }
    });

    expect(dispatchedTypes).toEqual(["pointerDown", "click", "doubleClick"]);
    expect(result).toEqual(preventedDispatchResult);
  });

  it("lets widget default prevention own pointerdown before retained hits", () => {
    expect(
      resolveMountedPointerPolicyDecision({
        status: "primary",
        pointerDispatch: preventedDispatchResult,
        clickDispatch: emptyDispatchResult,
        interactionTarget: createSelectionTarget()
      })
    ).toEqual(
      expect.objectContaining({
        kind: "widget-dispatch",
        shouldFocusEditor: true,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false
      })
    );
  });

  it("keeps lock views in hit-test-only mode", () => {
    expect(
      resolveMountedPointerPolicyDecision({
        status: "lock",
        pointerDispatch: emptyDispatchResult,
        clickDispatch: emptyDispatchResult,
        interactionTarget: createSelectionTarget()
      })
    ).toEqual(
      expect.objectContaining({
        kind: "locked-hit-test",
        shouldFocusEditor: false,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false
      })
    );
  });

  it("routes dispatch policies without text selection", () => {
    const pointerPolicy: QuireViewPointerPolicy = {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    };

    expect(
      resolveMountedPointerPolicyDecision({
        status: "primary",
        pointerDispatch: emptyDispatchResult,
        clickDispatch: emptyDispatchResult,
        interactionTarget: createSelectionTarget({
          domain: "control",
          commandTarget: "control",
          hitKind: "control",
          pointerPolicy
        })
      })
    ).toEqual(
      expect.objectContaining({
        kind: "target-dispatch",
        pointerPolicy,
        shouldFocusEditor: true,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false
      })
    );
  });

  it("lets pass-through policies skip mounted editor handling", () => {
    const pointerPolicy: QuireViewPointerPolicy = {
      kind: "pass-through",
      shouldFocusEditor: false,
      shouldPreventDefault: false
    };

    expect(
      resolveMountedPointerPolicyDecision({
        status: "primary",
        pointerDispatch: emptyDispatchResult,
        clickDispatch: emptyDispatchResult,
        interactionTarget: createSelectionTarget({ pointerPolicy })
      })
    ).toEqual(
      expect.objectContaining({
        kind: "pass-through",
        pointerPolicy,
        shouldFocusEditor: false,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false
      })
    );
  });

  it("treats pointer misses as pass-through instead of focusing stale input", () => {
    expect(
      resolveMountedPointerPolicyDecision({
        status: "primary",
        pointerDispatch: emptyDispatchResult,
        clickDispatch: emptyDispatchResult,
        interactionTarget: null
      })
    ).toEqual(
      expect.objectContaining({
        kind: "pass-through",
        shouldFocusEditor: false,
        shouldRunPluginClickProps: false,
        shouldStartSelection: false,
        shouldCapturePointer: false,
        shouldKeepInteractionTarget: false
      })
    );
  });

  it("defaults ordinary document targets to selection", () => {
    expect(
      resolveMountedPointerPolicyDecision({
        status: "primary",
        pointerDispatch: emptyDispatchResult,
        clickDispatch: emptyDispatchResult,
        interactionTarget: createSelectionTarget()
      })
    ).toEqual(
      expect.objectContaining({
        kind: "selection",
        shouldFocusEditor: true,
        shouldRunPluginClickProps: true,
        shouldStartSelection: true
      })
    );
  });

  it("adds pointer decisions without replacing existing interaction diagnostics", () => {
    const hitTestResult: QuireHitTestResult = {
      kind: "position",
      position: { pos: 4, bias: -1 },
      inside: 1,
      rect: { x: 10, y: 20, width: 80, height: 16 },
      diagnostics: {
        querySource: "retained-nearest-caret",
        selection: {
          domain: "text",
          commandTarget: "editable-text",
          hitKind: "position"
        },
        migrationFallbacks: [
          {
            kind: "viewport-rect-fallback",
            source: "viewport-fallback"
          }
        ]
      }
    };
    const pointerPolicy: QuireViewPointerPolicy = {
      kind: "pass-through",
      shouldFocusEditor: false
    };
    const decision = resolveMountedPointerPolicyDecision({
      status: "primary",
      pointerDispatch: emptyDispatchResult,
      clickDispatch: emptyDispatchResult,
      interactionTarget: createSelectionTarget({ pointerPolicy })
    });

    expect(
      withMountedPointerPolicyDiagnostics(hitTestResult, decision).diagnostics
    ).toEqual(expect.objectContaining({
      querySource: "retained-nearest-caret",
      selection: {
        domain: "text",
        commandTarget: "editable-text",
        hitKind: "position"
      },
      pointerDecision: {
        decision: "pass-through",
        pointerPolicy,
        passThrough: true
      },
      migrationFallbacks: [
        expect.objectContaining({ kind: "viewport-rect-fallback" })
      ]
    }));
  });
});

/**
 * Creates interaction target facts for mounted policy tests.
 *
 * @param overrides - Target fields that should override the default text target.
 * @returns Interaction selection target used by pointer policy tests.
 */
function createSelectionTarget(
  overrides: Partial<QuireInteractionSelectionTarget> = {}
): QuireInteractionSelectionTarget {
  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    ...overrides
  };
}
