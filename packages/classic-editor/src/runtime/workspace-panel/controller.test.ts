import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelFreshness,
  ClassicEditorWorkspacePanelTarget
} from "../../types/workspace-panel";
import { ClassicEditorWorkspacePanelHostRuntime } from "./controller";

/** Creates one inert typed panel contribution for controller tests. */
function contribution(
  id: string,
  connect?: ClassicEditorWorkspacePanelContribution["connect"]
): ClassicEditorWorkspacePanelContribution {
  return {
    id,
    kind: id === "review" ? "review" : "object",
    title: id,
    ...(connect === undefined ? {} : { connect }),
    mount: () => ({ element: null, destroy: () => undefined })
  };
}

/** Creates one explicit stable target without a live selection fallback. */
function target(id: string, revision = "target-1"): ClassicEditorWorkspacePanelTarget {
  return {
    kind: "object",
    id,
    ownerId: "fixture",
    revision,
    label: `Target ${id}`
  };
}

/** Creates one monotonic target freshness value. */
function freshness(
  revision: number,
  status: ClassicEditorWorkspacePanelFreshness["status"] = "ready"
): ClassicEditorWorkspacePanelFreshness {
  return { revision, status, reason: status === "ready" ? null : `fixture-${status}` };
}

describe("Classic Editor Workspace Panel host", () => {
  it("owns one typed open, push, back, pin, replace, close, and focus lifecycle", () => {
    const host = new ClassicEditorWorkspacePanelHostRuntime();
    const first = contribution("object");
    const second = contribution("review");
    host.register(first);
    host.register(second);
    const trigger = { focus: vi.fn(), isConnected: true };
    const panel = { focus: vi.fn(), isConnected: true };
    host.bindFocusSurface(panel);

    expect(host.open({
      contribution: first,
      target: target("image-1"),
      freshness: freshness(1),
      returnFocus: trigger
    })).toBe(true);
    expect(host.push({
      contribution: second,
      target: target("review-1"),
      freshness: freshness(1),
      returnFocus: null
    })).toBe(true);
    expect(host.snapshot.stack.map((entry) => entry.contribution.id))
      .toEqual(["object", "review"]);
    expect(host.setPinned(true)).toBe(true);
    expect(host.snapshot.active?.pinned).toBe(true);
    expect(host.back()).toBe(true);
    expect(panel.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(host.snapshot.active?.contribution).toBe(first);

    expect(host.replace({
      contribution: second,
      target: target("review-2"),
      freshness: freshness(2),
      returnFocus: null
    })).toBe(true);
    expect(host.snapshot.stack).toHaveLength(1);
    expect(host.snapshot.active?.contribution).toBe(second);
    expect(host.snapshot.active?.returnFocus).toBe(trigger);
    expect(host.close("escape")).toBe(true);
    expect(host.snapshot).toMatchObject({ active: null, closeReason: "escape" });
    expect(trigger.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("retains exact targets and accepts only monotonic matching freshness", () => {
    const host = new ClassicEditorWorkspacePanelHostRuntime();
    const panel = contribution("object");
    host.register(panel);
    const retained = target("table-9", "map-3");
    host.open({
      contribution: panel,
      target: retained,
      freshness: freshness(3),
      returnFocus: null
    });

    expect(host.updateFreshness(
      target("current-selection", "map-4"),
      freshness(4, "stale")
    )).toBe(false);
    expect(host.updateFreshness(retained, freshness(2, "locked"))).toBe(false);
    expect(host.updateFreshness(retained, freshness(4, "locked"))).toBe(true);
    expect(host.snapshot.active).toMatchObject({
      target: retained,
      freshness: { revision: 4, status: "locked", reason: "fixture-locked" }
    });
    expect(host.snapshot.active?.target.id).toBe("table-9");
  });

  it("isolates registrations and duplicate ids across editor instances", () => {
    const first = new ClassicEditorWorkspacePanelHostRuntime();
    const second = new ClassicEditorWorkspacePanelHostRuntime();
    const firstPanel = contribution("same");
    const secondPanel = contribution("same");
    first.register(firstPanel);
    second.register(secondPanel);

    expect(() => first.register(contribution("same"))).toThrowError(/unique/u);
    expect(first.open({
      contribution: firstPanel,
      target: target("first"),
      freshness: freshness(0),
      returnFocus: null
    })).toBe(true);
    expect(second.snapshot.active).toBeNull();
    expect(second.open({
      contribution: secondPanel,
      target: target("second"),
      freshness: freshness(0),
      returnFocus: null
    })).toBe(true);
    expect(first.snapshot.active?.target.id).toBe("first");
    expect(second.snapshot.active?.target.id).toBe("second");
  });

  it("cleans plugin connections, listeners, active entries, and focus on destroy", () => {
    const cleanup = vi.fn();
    const connect = vi.fn(() => cleanup);
    const host = new ClassicEditorWorkspacePanelHostRuntime();
    const listener = vi.fn();
    const panel = contribution("object", connect);
    host.subscribe(listener);
    const unregister = host.register(panel);
    const trigger = { focus: vi.fn(), isConnected: true };
    host.open({
      contribution: panel,
      target: target("image-1"),
      freshness: freshness(1),
      returnFocus: trigger
    });

    expect(connect).toHaveBeenCalledWith(host);
    host.destroy("unmount");
    unregister();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      active: null,
      closeReason: "unmount"
    }));
    expect(trigger.focus).toHaveBeenCalledOnce();
    expect(() => host.subscribe(() => undefined)).toThrowError(/destroyed/u);
  });

  it("removes active occurrences when their exact contribution unregisters", () => {
    const host = new ClassicEditorWorkspacePanelHostRuntime();
    const parent = contribution("object");
    const child = contribution("review");
    host.register(parent);
    const unregisterChild = host.register(child);
    host.open({
      contribution: parent,
      target: target("object"),
      freshness: freshness(1),
      returnFocus: null
    });
    host.push({
      contribution: child,
      target: target("review"),
      freshness: freshness(1),
      returnFocus: null
    });

    unregisterChild();
    expect(host.snapshot.stack).toHaveLength(1);
    expect(host.snapshot.active?.contribution).toBe(parent);
    expect(host.snapshot.closeReason).toBeNull();
  });

  it("rejects empty target identities, invalid freshness, and unregistered objects", () => {
    const host = new ClassicEditorWorkspacePanelHostRuntime();
    const panel = contribution("object");
    const request = {
      contribution: panel,
      target: target("object"),
      freshness: freshness(0),
      returnFocus: null
    };

    expect(host.open(request)).toBe(false);
    host.register(panel);
    expect(() => host.open({ ...request, target: { ...request.target, id: " " } }))
      .toThrowError(/stable identity/u);
    expect(() => host.open({ ...request, freshness: freshness(-1) }))
      .toThrowError(/non-negative/u);
  });
});
