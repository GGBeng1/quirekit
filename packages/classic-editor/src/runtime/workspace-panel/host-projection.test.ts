import { describe, expect, it } from "vitest";
import type { ClassicEditorRenderContext } from "../../types";
import {
  projectClassicEditorWorkspacePanelHost,
  projectClassicEditorWorkspacePanelProduct
} from "./host-projection";

describe("Classic Editor Workspace Panel Host projection", () => {
  it("contains read-only facts without Host or task execution methods", () => {
    const resourceJob = Object.freeze({ job: "redacted" });
    const tasks = Object.freeze({ revision: 2, tasks: Object.freeze([]) });
    const context = {
      instance: {
        hostResources: { snapshot: resourceJob },
        tasks: { snapshot: tasks }
      }
    } as unknown as ClassicEditorRenderContext;

    const projection = projectClassicEditorWorkspacePanelHost(context);
    expect(projection).toEqual({ resourceJob, tasks });
    expect(Object.isFrozen(projection)).toBe(true);
    expect("start" in projection).toBe(false);
    expect("cancel" in projection).toBe(false);
    expect("retry" in projection).toBe(false);
    expect("update" in projection).toBe(false);
  });

  it("narrows product facts to typed editor and UI authorities without the instance", () => {
    const context = {
      editor: { commands: {} },
      root: {},
      ownerDocument: {},
      features: Object.freeze({ table: true }),
      locale: "zh-CN",
      backend: "canvas",
      ui: { state: {} },
      instance: { executeContribution: () => true }
    } as unknown as ClassicEditorRenderContext;

    const projection = projectClassicEditorWorkspacePanelProduct(context);
    expect(projection).toEqual({
      editor: context.editor,
      root: context.root,
      ownerDocument: context.ownerDocument,
      features: context.features,
      locale: "zh-CN",
      backend: "canvas",
      ui: context.ui
    });
    expect(Object.isFrozen(projection)).toBe(true);
    expect("instance" in projection).toBe(false);
    expect("executeContribution" in projection).toBe(false);
  });
});
