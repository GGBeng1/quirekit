import { describe, expect, it, vi } from "vitest";
import { synchronizeMountedPointerInput } from "./input-session";
import type { QuireMountedPointerPolicyDecision } from "./types";

describe("mounted pointer input session", () => {
  it("preserves native input for pass-through pointer actions", () => {
    const resetTransientState = vi.fn();

    synchronizeMountedPointerInput({
      inputBinding: { resetTransientState } as never,
      decision: createDecision({
        kind: "pass-through",
        shouldFocusEditor: false,
        shouldStartSelection: false
      })
    });

    expect(resetTransientState).not.toHaveBeenCalled();
  });

  it("restarts native input for editor-owned pointer actions", () => {
    const resetTransientState = vi.fn();

    synchronizeMountedPointerInput({
      inputBinding: { resetTransientState } as never,
      decision: createDecision({
        kind: "selection",
        shouldFocusEditor: true,
        shouldStartSelection: true
      })
    });

    expect(resetTransientState).toHaveBeenCalledWith({ restartNativeInput: "if-needed" });
  });
});

/**
 * Creates the policy fields relevant to native input ownership.
 *
 * @param overrides - Decision fields varied by the current test.
 * @returns Complete mounted pointer-policy decision.
 */
function createDecision(
  overrides: Pick<
    QuireMountedPointerPolicyDecision,
    "kind" | "shouldFocusEditor" | "shouldStartSelection"
  >
): QuireMountedPointerPolicyDecision {
  return {
    ...overrides,
    shouldRunPluginClickProps: false,
    shouldCapturePointer: false,
    shouldKeepInteractionTarget: false
  };
}
