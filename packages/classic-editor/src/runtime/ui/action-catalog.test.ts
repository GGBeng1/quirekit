import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorActionContext,
  ClassicEditorActionDefinition,
  ClassicEditorRenderContext
} from "../../types";
import { ClassicEditorActionCatalog } from "./action-catalog";

/** Creates a minimal mounted context used only to prove direct action projection. */
function renderContext(): ClassicEditorRenderContext {
  return {} as ClassicEditorRenderContext;
}

describe("Classic Editor action catalog", () => {
  it("projects typed definitions without exposing string-id execution", async () => {
    const run = vi.fn(() => true);
    const action: ClassicEditorActionDefinition = {
      id: "format.bold",
      label: "Bold",
      icon: "bold",
      group: "formatting",
      order: 1,
      shortcut: "Mod-B",
      canExecute: () => false,
      disabledReason: () => ({ code: "read-only", message: "Read only" }),
      run
    };
    const catalog = new ClassicEditorActionCatalog([action]);
    const context = renderContext();

    expect(catalog.resolve(action, context, undefined, "ribbon")).toEqual({
      available: true,
      canExecute: false,
      active: false,
      reason: { code: "read-only", message: "Read only" }
    });
    expect(catalog.definitions).toEqual([action]);
    expect("get" in catalog).toBe(false);
    expect(await catalog.execute(action, context, undefined, "selection-popup"))
      .toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("uses a stable fallback reason only for visible disabled actions", () => {
    const disabled: ClassicEditorActionDefinition = {
      id: "format.bold",
      label: "Bold",
      order: 1,
      canExecute: () => false,
      run: () => true
    };
    const hidden: ClassicEditorActionDefinition = {
      ...disabled,
      id: "format.hidden",
      isAvailable: () => false
    };
    const catalog = new ClassicEditorActionCatalog([disabled, hidden]);

    expect(catalog.resolve(disabled, renderContext(), undefined, "toolbar").reason)
      .toEqual({ code: "action-unavailable", message: "Bold" });
    expect(catalog.resolve(hidden, renderContext(), undefined, "toolbar"))
      .toMatchObject({ available: false, canExecute: false, reason: null });
  });

  it("runs a direct action once with the invoking surface", async () => {
    const run = vi.fn((context: ClassicEditorActionContext) => (
      context.trigger.source === "toolbar"
    ));
    const action: ClassicEditorActionDefinition = {
      id: "format.bold",
      label: "Bold",
      order: 1,
      run
    };
    const catalog = new ClassicEditorActionCatalog([action]);

    await expect(catalog.execute(action, renderContext(), undefined, "toolbar"))
      .resolves.toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rechecks canExecute immediately before running", async () => {
    let canExecute = true;
    const run = vi.fn(() => true);
    const action: ClassicEditorActionDefinition = {
      id: "format.bold",
      label: "Bold",
      order: 1,
      canExecute: () => canExecute,
      run
    };
    const catalog = new ClassicEditorActionCatalog([action]);
    const context = renderContext();

    expect(catalog.resolve(action, context, undefined, "ribbon").canExecute).toBe(true);
    canExecute = false;
    await expect(catalog.execute(action, context, undefined, "ribbon")).resolves.toBe(false);
    expect(run).not.toHaveBeenCalled();
  });
});
