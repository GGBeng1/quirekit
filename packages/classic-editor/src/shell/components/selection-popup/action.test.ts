import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorRenderContext,
  ClassicEditorSelectionPopupTrigger
} from "@classic/types";
import {
  executeClassicEditorSelectionPopupAction,
  resolveClassicEditorSelectionPopupActionState
} from "./action";
import type { ClassicEditorAnySelectionPopupItemContribution } from "./query";

const trigger: ClassicEditorSelectionPopupTrigger = {
  kind: "selection-popup",
  from: 1,
  to: 3,
  rect: { top: 1, right: 3, bottom: 2, left: 1, width: 2, height: 1 }
};

/** Creates the narrow mounted context required by selection action projections. */
function context(): ClassicEditorRenderContext {
  return {
    instance: {
      canExecuteContribution: vi.fn(() => false),
      executeContribution: vi.fn(() => true)
    }
  } as unknown as ClassicEditorRenderContext;
}

describe("Classic Editor selection-popup action helper", () => {
  it("projects and executes a direct typed action without behavior dispatch", async () => {
    const run = vi.fn(() => true);
    const item: ClassicEditorAnySelectionPopupItemContribution = {
      kind: "selection-popup-item",
      id: "selection.bold",
      label: "Bold",
      action: {
        id: "format.bold",
        label: "Bold",
        order: 1,
        isActive: () => true,
        run
      }
    };
    const mounted = context();

    expect(resolveClassicEditorSelectionPopupActionState(item, mounted, trigger))
      .toEqual({ active: true, disabled: false });
    await expect(executeClassicEditorSelectionPopupAction(item, mounted, trigger))
      .resolves.toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(mounted.instance.executeContribution).not.toHaveBeenCalled();
  });

  it("projects and executes a legacy behavior through its compatibility authority", async () => {
    const behavior = { execute: vi.fn(() => true), isActive: () => true };
    const item: ClassicEditorAnySelectionPopupItemContribution = {
      kind: "selection-popup-item",
      id: "selection.legacy",
      label: "Legacy",
      behavior
    };
    const mounted = context();
    const execute = mounted.instance.executeContribution as ReturnType<typeof vi.fn>;
    (mounted.instance.canExecuteContribution as ReturnType<typeof vi.fn>).mockReturnValue(true);

    expect(resolveClassicEditorSelectionPopupActionState(item, mounted, trigger))
      .toEqual({ active: true, disabled: false });
    await expect(executeClassicEditorSelectionPopupAction(item, mounted, trigger))
      .resolves.toBe(true);
    expect(execute).toHaveBeenCalledWith(
      behavior,
      undefined,
      { source: "selection-popup", detail: trigger }
    );
  });
});
