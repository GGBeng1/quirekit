import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorRenderContext
} from "../../types";
import {
  executeClassicEditorContributionAction,
  resolveClassicEditorContributionActionState
} from "./utils";

/** Creates one direct contribution without the legacy behavior shape. */
function contribution(action: ClassicEditorActionDefinition) {
  return { action };
}

describe("Classic Editor direct contribution actions", () => {
  it("executes the typed action without behavior-runtime dispatch", async () => {
    const run = vi.fn(() => true);
    const action: ClassicEditorActionDefinition = {
      id: "format.bold",
      label: "Bold",
      order: 1,
      run
    };
    const context = {} as ClassicEditorRenderContext;

    await expect(executeClassicEditorContributionAction(
      contribution(action), context, undefined, "toolbar"
    )).resolves.toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(resolveClassicEditorContributionActionState(
      contribution(action), context, undefined, "toolbar"
    ).canExecute).toBe(true);
  });
});
