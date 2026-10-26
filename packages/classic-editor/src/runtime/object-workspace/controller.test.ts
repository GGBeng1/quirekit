import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorRenderContext
} from "../../types";
import type {
  ClassicEditorObjectTarget,
  ClassicEditorObjectFreshness,
  ClassicEditorObjectWorkspaceContribution
} from "../../types/object-workspace";
import { ClassicEditorObjectWorkspaceRuntime } from ".";

describe("Classic object workspace controller", () => {
  it("projects the same direct actions into wide and narrow recipes", () => {
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    const contribution = objectContribution(9);
    runtime.activate(contribution);

    const wide = runtime.projectActions("wide");
    const narrow = runtime.projectActions("narrow");
    expect(wide.primary).toHaveLength(7);
    expect(wide.overflow).toHaveLength(2);
    expect(narrow.primary).toHaveLength(3);
    expect(narrow.overflow).toHaveLength(6);
    expect(wide.primary[0]?.action).toBe(contribution.actions[0]?.action);
    expect(narrow.primary[0]?.action).toBe(contribution.actions[0]?.action);
  });

  it("keeps a typed color control primary instead of exposing a payload-less menu action", () => {
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    const base = objectContribution(9);
    const contribution: ClassicEditorObjectWorkspaceContribution = {
      ...base,
      actions: base.actions.map((entry, index) => index === 8
        ? {
            ...entry,
            control: {
              kind: "color" as const,
              id: "fixture.color",
              value: null,
              mixed: false
            }
          }
        : entry)
    };
    runtime.activate(contribution);

    const narrow = runtime.projectActions("narrow");
    expect(narrow.primary.some(item => item.control?.id === "fixture.color"))
      .toBe(true);
    expect(narrow.overflow.some(item => item.control !== null)).toBe(false);
  });

  it("revalidates the exact target and never falls back to a new selection", async () => {
    const run = vi.fn(() => true);
    const contribution = objectContribution(4, run);
    let freshness: ClassicEditorObjectFreshness = ready();
    const exact = {
      ...contribution,
      resolveTarget: () => ({ target: contribution.target, freshness })
    };
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    runtime.activate(exact);
    expect(await runtime.execute(exact.actions[0]!.action, "contextual-popup")).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);

    freshness = { revision: 2, status: "stale", reason: { en: "Moved", "zh-CN": "对象已移动" } };
    expect(await runtime.execute(exact.actions[0]!.action, "contextual-popup")).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
    expect(runtime.snapshot.freshness?.status).toBe("stale");
  });

  it("rejects action objects that were not retained by the active contribution", async () => {
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    runtime.activate(objectContribution(4));
    expect(await runtime.execute(action("foreign", 1), "menu")).toBe(false);
  });

  it("executes an immediate action retained only by an Inspector section", async () => {
    const run = vi.fn(() => true);
    const base = objectContribution(4);
    const inspectorAction = action("inspector-action", 20, run);
    const contribution: ClassicEditorObjectWorkspaceContribution = {
      ...base,
      inspector: {
        ...base.inspector!,
        sections: [{
          id: "appearance",
          tabId: "layout",
          title: { en: "Appearance", "zh-CN": "外观" },
          fields: [],
          actions: [inspectorAction]
        }]
      }
    };
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    runtime.activate(contribution);

    expect(await runtime.execute(inspectorAction, "panel")).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("keeps Inspector unavailable when an object does not contribute one", () => {
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    const { inspector: _inspector, ...contribution } = objectContribution(4);
    runtime.activate(contribution);

    expect(runtime.snapshot.activeTabId).toBeNull();
    expect(runtime.openInspector("wide", null)).toBe(false);
    expect(runtime.openInspector("narrow", null)).toBe(false);
    expect(runtime.snapshot.sheetOpen).toBe(false);
  });

  it("opens the direct object contribution in the single Workspace Panel only on wide layouts", () => {
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    runtime.activate(objectContribution(4));
    const panelContribution = {
      id: "fixture-object-panel",
      kind: "object",
      title: "Object",
      mount: () => ({ element: null, destroy: () => undefined })
    } as const;
    let request: unknown;
    const panel = {
      snapshot: { active: null },
      open(next: unknown): boolean {
        request = next;
        return true;
      }
    } as unknown as import("../../types").ClassicEditorWorkspacePanelController;
    const disconnect = runtime.bindWorkspacePanel(panel, panelContribution);

    expect(runtime.openInspector("wide", null)).toBe(true);
    expect(request).toMatchObject({
      contribution: panelContribution,
      target: { id: "object-1", ownerId: "fixture" }
    });
    expect(runtime.snapshot.sheetOpen).toBe(false);
    disconnect?.();
  });

  it("retains an open Inspector sheet and selected tab across same-target refreshes", () => {
    const runtime = new ClassicEditorObjectWorkspaceRuntime(context());
    const initial = objectContribution(4);
    const withSecondTab: ClassicEditorObjectWorkspaceContribution = {
      ...initial,
      inspector: {
        ...initial.inspector!,
        tabs: [
          ...initial.inspector!.tabs,
          { id: "appearance", label: { en: "Appearance", "zh-CN": "外观" }, order: 1 }
        ]
      }
    };
    runtime.activate(withSecondTab);
    runtime.selectInspectorTab("appearance");
    expect(runtime.openInspector("narrow", null)).toBe(true);

    runtime.activate({ ...withSecondTab, actions: [...withSecondTab.actions] });

    expect(runtime.snapshot.sheetOpen).toBe(true);
    expect(runtime.snapshot.activeTabId).toBe("appearance");
  });
});

/** @returns Minimal mounted render context for direct action tests. */
function context(): ClassicEditorRenderContext {
  return {
    instance: {} as ClassicEditorRenderContext["instance"],
    editor: {} as ClassicEditorRenderContext["editor"],
    root: {} as HTMLElement,
    ownerDocument: {} as Document,
    features: {},
    locale: "zh-CN",
    backend: "canvas",
    ui: {} as ClassicEditorRenderContext["ui"]
  };
}

/** @param count - Number of direct actions. @param run - Optional shared runner. @returns Fixture contribution. */
function objectContribution(
  count: number,
  run: ClassicEditorActionDefinition["run"] = () => true
): ClassicEditorObjectWorkspaceContribution {
  const target = objectTarget();
  return {
    id: "fixture-object",
    target,
    resolveTarget: () => ({ target, freshness: ready() }),
    actions: Array.from({ length: count }, (_, index) => ({
      action: action(`action-${index}`, index, run),
      rank: index,
      prominence: index === count - 1 ? "overflow" : "primary"
    })),
    inspector: {
      title: { en: "Object", "zh-CN": "对象" },
      tabs: [{ id: "layout", label: { en: "Layout", "zh-CN": "布局" }, order: 0 }],
      sections: []
    }
  };
}

/** @returns Stable exact object target with canonical client geometry. */
function objectTarget(): ClassicEditorObjectTarget {
  return {
    id: "object-1",
    ownerId: "fixture",
    revision: "v1",
    kind: "fixture",
    label: { en: "Fixture object", "zh-CN": "示例对象" },
    anchor: {
      status: "ready",
      coordinateSpace: "client",
      snapshotVersion: 1,
      kind: "node",
      nodeId: "object-1",
      rects: [{ x: 200, y: 240, width: 180, height: 120 }],
      referenceRect: { x: 200, y: 240, width: 180, height: 120 },
      sourceTargetIds: ["object-1"]
    }
  };
}

/** @returns Ready exact-target freshness. */
function ready() {
  return { revision: 1, status: "ready", reason: null } as const;
}

/** @param id - Action id. @param order - Stable order. @param run - Runner. @returns Direct action. */
function action(
  id: string,
  order: number,
  run: ClassicEditorActionDefinition["run"] = () => true
): ClassicEditorActionDefinition {
  return { id, label: { en: id, "zh-CN": id }, order, run };
}
