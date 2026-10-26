import { describe, expect, it, vi } from "vitest";
import { ClassicEditorUiControllerRuntime } from "./controller";

describe("Classic Editor UI controller", () => {
  it("keeps automatic zoom intent until a manual choice, including the same percentage", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false);
    const listener = vi.fn();
    controller.subscribe(listener);
    expect(controller.state.zoomMode).toBe("manual");
    controller.setZoomMode("fit-width");
    controller.resolveFitZoom(82, "fit-width");
    controller.resolveFitZoom(82, "fit-width");
    expect(listener).toHaveBeenCalledTimes(2);
    controller.reconcileVisibility(true, true);
    expect(controller.state.zoomMode).toBe("fit-width");
    controller.setZoomMode("fit-page");
    controller.resolveFitZoom(90, "fit-width");
    expect(controller.state.zoom).toBe(82);
    controller.resolveFitZoom(55, "fit-page");
    controller.setZoom(55);
    controller.resolveFitZoom(45, "fit-page");
    expect(controller.state.zoomMode).toBe("manual");
    expect(controller.state.zoom).toBe(55);
  });

  it("retains bounded zoom independently of visibility and semantic state", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false);
    const listener = vi.fn();
    controller.subscribe(listener);
    expect(controller.state.zoom).toBe(100);
    controller.setZoom(60);
    controller.setZoom(60);
    expect(listener).toHaveBeenCalledTimes(1);
    controller.reconcileVisibility(true, true);
    expect(controller.state.zoom).toBe(60);
    controller.setZoom(10);
    expect(controller.state.zoom).toBe(25);
    controller.setZoom(500);
    expect(controller.state.zoom).toBe(400);
    expect(() => controller.setZoom(NaN)).toThrow(RangeError);
  });
  it("owns ruler visibility without recreating the editor or changing document semantics", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false, false);
    const listener = vi.fn();
    controller.subscribe(listener);
    const semantic = controller.state.semantic;
    expect(controller.state.rulerVisible).toBe(false);
    controller.setRulerVisible(true);
    controller.setRulerVisible(true);
    expect(controller.state.rulerVisible).toBe(true);
    expect(controller.state.semantic).toEqual(semantic);
    expect(listener).toHaveBeenCalledTimes(1);
    controller.reconcileVisibility(true, false);
    expect(controller.state.rulerVisible).toBe(true);
    controller.reconcileVisibility(true, false, false);
    expect(controller.state.rulerVisible).toBe(false);
  });

  it("owns sidebar visibility and active-panel state independently from DOM", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false);
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.openSidebarPanel("right", "paragraph-settings");
    expect(controller.state.rightSidebar).toEqual({
      visible: true,
      activePanelId: "paragraph-settings",
      targetId: null,
      navigationRevision: 0
    });

    controller.toggleSidebar("right");
    expect(controller.state.rightSidebar).toEqual({
      visible: false,
      activePanelId: "paragraph-settings",
      targetId: null,
      navigationRevision: 0
    });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    controller.setSidebarVisible("right", true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty panel id", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false);
    expect(() => controller.openSidebarPanel("right", " ")).toThrowError(
      /panel ids must not be empty/u
    );
  });

  it("publishes repeatable sidebar target-navigation requests", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false);
    controller.openSidebarPanel("right", "global-settings", {
      targetId: "fonts"
    });
    expect(controller.state.rightSidebar).toEqual({
      visible: true,
      activePanelId: "global-settings",
      targetId: "fonts",
      navigationRevision: 1
    });
    controller.openSidebarPanel("right", "global-settings", {
      targetId: "fonts"
    });
    expect(controller.state.rightSidebar.navigationRevision).toBe(2);
    expect(() => controller.openSidebarPanel("right", "global-settings", {
      targetId: " "
    })).toThrowError(/target ids must not be empty/u);
  });

  it("publishes immutable semantic snapshots only for observable changes", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false);
    const listener = vi.fn();
    controller.subscribe(listener);
    const snapshot = {
      selection: { from: 2, to: 4, empty: false },
      target: "text",
      values: { alignment: { value: "left" } },
      mixed: ["fontSize"],
      can: { "format.bold": true },
      reasons: {},
      busy: [],
      geometry: { left: 1, top: 2, width: 3, height: 4 },
      freshness: 1
    };

    controller.setSemanticSnapshot(snapshot);
    controller.setSemanticSnapshot(snapshot);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(controller.state.semantic)).toBe(true);
    expect(Object.isFrozen(controller.state.semantic.mixed)).toBe(true);
    expect(Object.isFrozen(controller.state.semantic.values.alignment)).toBe(true);
    snapshot.mixed.push("color");
    (snapshot.values.alignment as { value: string }).value = "right";
    expect(controller.state.semantic.mixed).toEqual(["fontSize"]);
    expect(controller.state.semantic.values).toEqual({ alignment: { value: "left" } });
  });

  it("accepts first freshness zero, ignores stale revisions, and rejects invalid revisions", () => {
    const controller = new ClassicEditorUiControllerRuntime(false, false);
    const listener = vi.fn();
    controller.subscribe(listener);
    const snapshot = {
      selection: null,
      target: null,
      values: {},
      mixed: [],
      can: {},
      reasons: {},
      busy: [],
      geometry: null,
      freshness: 0
    };

    controller.setSemanticSnapshot(snapshot);
    controller.setSemanticSnapshot({ ...snapshot, freshness: 0 });
    controller.setSemanticSnapshot({ ...snapshot, freshness: 1 });
    controller.setSemanticSnapshot({ ...snapshot, freshness: 0 });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(controller.state.semantic.freshness).toBe(1);
    expect(() => controller.setSemanticSnapshot({ ...snapshot, freshness: -1 }))
      .toThrowError(/non-negative safe integer/u);
    expect(() => controller.setSemanticSnapshot({ ...snapshot, freshness: 1.5 }))
      .toThrowError(/non-negative safe integer/u);
  });
});
