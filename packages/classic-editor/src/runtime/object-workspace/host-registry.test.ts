import { describe, expect, it, vi } from "vitest";
import type { ClassicEditorInstance } from "../../types";
import type {
  ClassicEditorObjectWorkspaceContribution,
  ClassicEditorObjectWorkspaceController
} from "../../types/object-workspace";
import { ClassicEditorObjectWorkspaceHostRegistry } from "./host-registry";

describe("Classic object workspace host registry", () => {
  it("isolates exact instances and releases only the matching controller", () => {
    const registry = new ClassicEditorObjectWorkspaceHostRegistry();
    const first = {} as ClassicEditorInstance;
    const second = {} as ClassicEditorInstance;
    const firstController = controller();
    const secondController = controller();
    const releaseFirst = registry.register(first, firstController);
    registry.register(second, secondController);
    const contribution = {} as ClassicEditorObjectWorkspaceContribution;

    expect(registry.read(first)).toBe(firstController);
    expect(registry.read(second)).toBe(secondController);
    expect(registry.activate(first, contribution)).toBe(true);
    expect(firstController.activate).toHaveBeenCalledWith(contribution);
    expect(secondController.activate).not.toHaveBeenCalled();
    releaseFirst();
    expect(registry.read(first)).toBeNull();
    expect(registry.has(first)).toBe(false);
    expect(registry.has(second)).toBe(true);
  });

  it("rejects a second controller for the same mounted instance", () => {
    const registry = new ClassicEditorObjectWorkspaceHostRegistry();
    const instance = {} as ClassicEditorInstance;
    registry.register(instance, controller());
    expect(() => registry.register(instance, controller())).toThrow(RangeError);
  });
});

/** @returns Minimal typed controller with observable activation. */
function controller(): ClassicEditorObjectWorkspaceController {
  return {
    activate: vi.fn(() => true)
  } as unknown as ClassicEditorObjectWorkspaceController;
}
