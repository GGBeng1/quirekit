import { Extension } from "@quirekit/core";
import type { QuireEditor } from "@quirekit/core";
import type { EditorState } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import type {} from "./augmentation";
import { MountedViewServices } from "./runtime";
import type { QuireMountedServiceContext, QuireMountedViewServiceContribution } from "./types";

/** @param contributions - Factories under test. @returns Minimal public mount context. */
function context(contributions: readonly QuireMountedViewServiceContribution[]): QuireMountedServiceContext {
  return {
    editor: { extensions: [Extension.create({
      name: "services", addMountedViewServices: () => contributions
    })] } as unknown as QuireEditor,
    view: {} as QuireMountedServiceContext["view"],
    input: undefined,
    suspendVisualAccessibility: () => () => {},
    activateText: () => false,
    presentOverlay: () => false
  };
}

describe("mounted service lifetime", () => {
  it("creates per mount, updates without rebuilding, and cleans up once", () => {
    const update = vi.fn();
    const destroy = vi.fn();
    const create = vi.fn(() => ({ update, destroy }));
    const shared = context([{ id: "accessibility", create }]);
    const first = new MountedViewServices();
    const second = new MountedViewServices();
    first.initialize(shared);
    first.initialize(shared);
    second.initialize(shared);
    first.update({ plugins: [] } as unknown as EditorState);
    first.update({ plugins: [] } as unknown as EditorState);
    expect(create).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
    first.destroy();
    first.destroy();
    first.update({} as EditorState);
    second.destroy();
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("rejects duplicate services before creating resources", () => {
    const create = vi.fn(() => null);
    expect(() => new MountedViewServices().initialize(context([
      { id: "duplicate", create }, { id: "duplicate", create }
    ]))).toThrow(/Duplicate/);
    expect(create).not.toHaveBeenCalled();
  });

  it("releases already created resources when a later factory fails", () => {
    const destroy = vi.fn();
    expect(() => new MountedViewServices().initialize(context([
      { id: "first", create: () => ({ destroy }) },
      { id: "second", create: () => { throw new Error("factory"); } }
    ]))).toThrow("factory");
    expect(destroy).toHaveBeenCalledOnce();
  });
});
