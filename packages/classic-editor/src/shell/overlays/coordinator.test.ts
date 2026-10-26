import { describe, expect, it, vi } from "vitest";
import { ClassicEditorOverlayCoordinator } from "./coordinator";

describe("Classic Editor overlay coordinator", () => {
  it("keeps exclusivity inside one editor root", () => {
    const coordinator = new ClassicEditorOverlayCoordinator();
    const firstRoot = {};
    const secondRoot = {};
    const closeFirst = vi.fn();
    const closeFirstReplacement = vi.fn();
    const closeSecond = vi.fn();

    coordinator.activate({
      id: "first",
      root: firstRoot,
      close: closeFirst
    });
    coordinator.activate({
      id: "second",
      root: secondRoot,
      close: closeSecond
    });

    expect(closeFirst).not.toHaveBeenCalled();
    expect(closeSecond).not.toHaveBeenCalled();

    coordinator.activate({
      id: "first-replacement",
      root: firstRoot,
      close: closeFirstReplacement
    });

    expect(closeFirst).toHaveBeenCalledOnce();
    expect(closeSecond).not.toHaveBeenCalled();
    expect(coordinator.activeIds).toEqual([
      "second",
      "first-replacement"
    ]);
  });

  it("dismisses every active root outside the captured target", () => {
    const coordinator = new ClassicEditorOverlayCoordinator();
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();

    coordinator.activate({ id: "first", root: {}, close: closeFirst });
    coordinator.activate({ id: "second", root: {}, close: closeSecond });
    coordinator.dismissOutside((id) => id === "second");

    expect(closeFirst).toHaveBeenCalledOnce();
    expect(closeSecond).not.toHaveBeenCalled();
    expect(coordinator.activeIds).toEqual(["second"]);
  });

  it("moves one overlay identity when its Classic root changes", () => {
    const coordinator = new ClassicEditorOverlayCoordinator();
    const close = vi.fn();

    coordinator.activate({ id: "moving", root: {}, close });
    coordinator.activate({ id: "moving", root: {}, close });

    expect(close).toHaveBeenCalledOnce();
    expect(coordinator.activeIds).toEqual(["moving"]);
    coordinator.release("moving");
    expect(coordinator.activeIds).toEqual([]);
  });

  it("preserves a modal workspace that rejects outside-pointer dismissal", () => {
    const coordinator = new ClassicEditorOverlayCoordinator();
    const close = vi.fn();
    let dismissible = false;

    coordinator.activate({
      id: "modal-workspace",
      root: {},
      close,
      dismissOnOutsidePointer: () => dismissible
    });
    coordinator.dismissOutside(() => false);

    expect(close).not.toHaveBeenCalled();
    expect(coordinator.activeIds).toEqual(["modal-workspace"]);

    dismissible = true;
    coordinator.dismissOutside(() => false);
    expect(close).toHaveBeenCalledOnce();
    expect(coordinator.activeIds).toEqual([]);
  });
});
