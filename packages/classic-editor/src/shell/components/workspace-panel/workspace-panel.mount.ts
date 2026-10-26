// @vitest-environment happy-dom

import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelTarget
} from "@classic/types/workspace-panel";
import {
  mountWorkspacePanelFixture,
  type MountedWorkspacePanelFixture
} from "./mount-fixture";

const fixtures: MountedWorkspacePanelFixture[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  document.body.replaceChildren();
});

/** Creates one visible typed contribution and tracks its lifecycle. */
function panel(
  id: string,
  kind: ClassicEditorWorkspacePanelContribution["kind"],
  destroy = vi.fn()
): ClassicEditorWorkspacePanelContribution {
  return {
    id,
    kind,
    title: { "zh-CN": `${id} 工作区`, en: `${id} workspace` },
    mount: ({ entry, host }) => {
      const content = document.createElement("section");
      content.dataset.fixturePanel = id;
      content.textContent = `${entry.target.id}:${host.tasks.revision}`;
      return {
        element: content,
        destroy,
        updatePanel(next) {
          content.textContent = `${next.entry.target.id}:${next.host.tasks.revision}`;
        }
      };
    }
  };
}

/** Creates one explicit stable object target. */
function target(id: string): ClassicEditorWorkspacePanelTarget {
  return {
    kind: "object",
    id,
    ownerId: "fixture",
    revision: "1",
    label: { "zh-CN": `对象 ${id}`, en: `Object ${id}` }
  };
}

describe("Classic Editor Workspace Panel mount", () => {
  it("renders typed plugin content, shared ARIA chrome, pin, back, stale target, and focus return", async () => {
    const parent = panel("object", "object");
    const child = panel("review", "review");
    const fixture = await mountFixture([parent, child]);
    const trigger = document.createElement("button");
    fixture.root.prepend(trigger);
    trigger.focus();
    fixture.controller.open({
      contribution: fixture.panels[0]!,
      target: target("image-7"),
      freshness: { revision: 1, status: "ready", reason: null },
      returnFocus: trigger
    });
    await nextTick();
    await nextTick();

    const host = fixture.root.querySelector<HTMLElement>(".qk-workspace-panel");
    expect(host?.getAttribute("role")).toBe("complementary");
    expect(host?.getAttribute("aria-label")).toBe("工作区面板");
    expect(host?.textContent).toContain("object 工作区");
    expect(host?.textContent).toContain("对象 image-7");
    expect(host?.querySelector("[data-fixture-panel='object']")?.textContent)
      .toBe("image-7:0");
    expect(document.activeElement).toBe(host);

    button(host, "固定工作区").click();
    await nextTick();
    expect(button(host, "取消固定工作区").getAttribute("aria-pressed")).toBe("true");

    fixture.controller.push({
      contribution: fixture.panels[1]!,
      target: target("revision-3"),
      freshness: { revision: 1, status: "ready", reason: null },
      returnFocus: null
    });
    await nextTick();
    expect(button(host, "返回上一级")).toBeDefined();
    host?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowLeft",
      altKey: true,
      bubbles: true,
      cancelable: true
    }));
    await nextTick();
    expect(host?.textContent).toContain("object 工作区");

    fixture.controller.updateFreshness(
      target("image-7"),
      { revision: 2, status: "stale", reason: "remote-remap-failed" }
    );
    await nextTick();
    expect(host?.dataset.targetStatus).toBe("stale");
    expect(host?.textContent).toContain("目标已变化");
    expect(host?.textContent).toContain("remote-remap-failed");

    host?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true
    }));
    await nextTick();
    expect(fixture.root.querySelector(".qk-workspace-panel")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps document-level Escape outside the panel root from closing it", async () => {
    const fixture = await mountFixture([panel("task", "task")], "en");
    fixture.controller.open({
      contribution: fixture.panels[0]!,
      target: { ...target("export-1"), kind: "task" },
      freshness: { revision: 0, status: "ready", reason: null },
      returnFocus: null
    });
    await nextTick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();

    const host = fixture.root.querySelector<HTMLElement>(".qk-workspace-panel");
    expect(host).not.toBeNull();
    expect(host?.getAttribute("aria-label")).toBe("Workspace panel");
  });

  it("isolates duplicate panel ids across roots and cleans mounted content on unmount", async () => {
    const firstDestroy = vi.fn();
    const secondDestroy = vi.fn();
    const first = await mountFixture([panel("same", "object", firstDestroy)]);
    const second = await mountFixture([panel("same", "object", secondDestroy)], "en");
    first.controller.open({
      contribution: first.panels[0]!,
      target: target("first"),
      freshness: { revision: 0, status: "ready", reason: null },
      returnFocus: null
    });
    second.controller.open({
      contribution: second.panels[0]!,
      target: target("second"),
      freshness: { revision: 0, status: "ready", reason: null },
      returnFocus: null
    });
    await nextTick();

    expect(first.root.textContent).toContain("first:0");
    expect(first.root.textContent).not.toContain("second:0");
    expect(second.root.textContent).toContain("second:0");
    first.destroy();
    fixtures.splice(fixtures.indexOf(first), 1);
    expect(firstDestroy).toHaveBeenCalledOnce();
    expect(secondDestroy).not.toHaveBeenCalled();
    expect(second.root.querySelector(".qk-workspace-panel")).not.toBeNull();
  });
});

/** Mounts and tracks one full workspace-widget bridge fixture. */
async function mountFixture(
  panels: readonly ClassicEditorWorkspacePanelContribution[],
  locale: "zh-CN" | "en" = "zh-CN"
): Promise<MountedWorkspacePanelFixture> {
  const fixture = await mountWorkspacePanelFixture(panels, locale);
  fixtures.push(fixture);
  return fixture;
}

/** Finds one native button by its accessible label. */
function button(root: HTMLElement | null, label: string): HTMLButtonElement {
  const value = root?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(value, `button ${label}`).not.toBeNull();
  return value!;
}
