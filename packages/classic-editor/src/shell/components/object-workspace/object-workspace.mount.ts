// @vitest-environment happy-dom
import { computed, nextTick } from "vue";
import type { ClassicEditorObjectToolbarFactory, ClassicEditorObjectToolbarState } from "@classic/types/object-workspace";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createClassicEditorObjectWorkspaceFixture,
  type ClassicEditorObjectWorkspaceFixture
} from "./mount-fixture";

const fixtures: ClassicEditorObjectWorkspaceFixture[] = [];

/** @param target - Native control focused through the public Tooltip keyboard path. */
function keyboardFocus(target: HTMLElement): void {
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 20, 32, 28));
  const matches = target.matches.bind(target);
  vi.spyOn(target, "matches").mockImplementation(selector => (
    selector === ":focus-visible" || matches(selector)
  ));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  target.focus();
}

/** @param width - Root-local fixture width. @returns Mounted object fixture. */
function fixture(width: number): ClassicEditorObjectWorkspaceFixture {
  const value = createClassicEditorObjectWorkspaceFixture(document, width);
  fixtures.push(value);
  return value;
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.mounted.destroy();
  document.body.replaceChildren();
});

describe("Classic object workspace mounted surfaces", () => {
  it("retains one native multirow factory per exact target and releases its commit guard", async () => {
    const value = fixture(1000);
    const states: ClassicEditorObjectToolbarState[] = [];
    const factory: ClassicEditorObjectToolbarFactory = state => {
      states.push(state);
      return { label: "配置式对象工具", items: [], rows: computed(() => [
        { value: "text", label: "文字格式", items: [{ value: "bold", label: state.context.locale === "zh-CN" ? "加粗" : "Bold" }] },
        { value: "object", label: "对象操作", items: [{ value: "insert", label: "插入" }] }
      ]) };
    };
    const contribution = { ...value.contribution, toolbar: factory };
    value.mounted.activate(contribution);
    await nextTick();
    expect(value.root.querySelectorAll('[role="toolbar"]')).toHaveLength(1);
    expect(value.root.querySelectorAll('[data-qk-toolbar-row]')).toHaveLength(2);
    expect(states).toHaveLength(1);
    expect(states[0]!.isTargetCurrent?.()).toBe(true);
    value.mounted.update?.({ ...value.context, locale: "en" });
    await nextTick();
    expect(states).toHaveLength(1);
    expect(value.root.querySelector('[aria-label="Bold"]')).not.toBeNull();
    value.mounted.controller.clear("selection");
    await nextTick();
    expect(states[0]!.isTargetCurrent?.()).toBe(false);
    expect(value.root.querySelector('[role="toolbar"]')).toBeNull();
  });

  it("renders a canonical floating bar with seven ranked actions and direct More menu", async () => {
    const value = fixture(1000);
    await nextTick();
    const bar = value.root.querySelector<HTMLElement>('[data-object-layout="floating"]')!;
    expect(bar).not.toBeNull();
    expect(bar.closest("[data-qk-classic-document-overlays]")).not.toBeNull();
    expect(bar.parentElement?.style.position).toBe("absolute");
    expect(bar.dataset.objectOcclusion).toBe("none");
    expect(bar.querySelectorAll("[data-object-action]")).toHaveLength(7);
    const first = bar.querySelector<HTMLButtonElement>(
      '[data-object-action="action-0"]'
    )!;
    expect(first.getAttribute("aria-label")).toBe("操作 1");
    expect(first.hasAttribute("title")).toBe(false);
    expect(first.querySelector('[data-icon="table"]')).not.toBeNull();
    expect(first.hasAttribute("data-qk-toolbar-item")).toBe(true);
    const properties = bar.querySelector<HTMLButtonElement>(
      "[data-object-properties]"
    )!;
    expect(properties.getAttribute("aria-label")).toBe("属性");
    expect(properties.hasAttribute("title")).toBe(false);
    expect(properties.querySelector('[data-icon="paragraphSettings"]'))
      .not.toBeNull();

    first.click();
    await vi.waitFor(() => expect(value.root.dataset.commandCount).toBe("1"));
    const more = bar.querySelector<HTMLButtonElement>("[data-object-more-trigger]")!;
    expect(more.getAttribute("aria-label")).toBe("更多");
    expect(more.hasAttribute("title")).toBe(false);
    expect(more.querySelector('[data-icon="moreHorizontal"]')).not.toBeNull();
    more.click();
    await nextTick();
    expect(value.root.querySelector('[role="menu"]')).not.toBeNull();
    expect(value.root.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    value.root.querySelector<HTMLElement>('[role="menu"]')?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await vi.waitFor(() => expect(document.activeElement).toBe(more));

    keyboardFocus(first);
    await vi.waitFor(() => expect(
      [...document.body.querySelectorAll('[role="tooltip"]')].some(
        tooltip => tooltip.textContent?.includes("操作 1") === true
      )
    ).toBe(true));
  });

  it("leaves document scrolling to the shared overlay without rereading the target or remounting", async () => {
    const value = fixture(1000);
    const resolveTarget = vi.fn(value.contribution.resolveTarget);
    value.mounted.activate({ ...value.contribution, resolveTarget });
    await nextTick();
    const surface = value.root.querySelector<HTMLElement>(".qk-object-action-surface")!;
    const top = surface.style.top;
    const reads = resolveTarget.mock.calls.length;
    document.dispatchEvent(new Event("scroll", { bubbles: true }));
    window.dispatchEvent(new Event("resize"));
    await nextTick();
    expect(value.root.querySelector(".qk-object-action-surface")).toBe(surface);
    expect(surface.style.top).toBe(top);
    expect(resolveTarget).toHaveBeenCalledTimes(reads);
  });

  it("reprojects actions when the retained object contribution changes", async () => {
    const value = fixture(1000);
    await nextTick();
    const first = value.contribution.actions[0]!;
    value.mounted.activate({
      ...value.contribution,
      actions: [{
        ...first,
        action: {
          ...first.action,
          id: "replacement-action",
          label: { "zh-CN": "替换动作", en: "Replacement action" }
        }
      }]
    });
    await nextTick();

    expect(value.root.querySelector('[data-object-action="action-0"]'))
      .toBeNull();
    expect(value.root.querySelector<HTMLButtonElement>(
      '[data-object-action="replacement-action"]'
    )?.getAttribute("aria-label")).toBe("替换动作");
  });

  it("does not invent a Properties entry for objects without an Inspector", async () => {
    const value = fixture(1000);
    const { inspector: _inspector, ...contribution } = value.contribution;
    value.mounted.activate(contribution);
    await nextTick();

    expect(value.root.querySelector("[data-object-properties]")).toBeNull();
    expect(value.root.querySelector("[data-object-inspector]")).toBeNull();
    expect(value.mounted.controller.openInspector("wide", null)).toBe(false);
  });

  it.each([720, 390])("uses a bottom bar and full-height Inspector Sheet at %i", async (width) => {
    const value = fixture(width);
    await nextTick();
    const expected = width === 390 ? "narrow" : "compact";
    expect(value.root.querySelector("[data-object-workspace-layout]")?.getAttribute(
      "data-object-workspace-layout"
    )).toBe(expected);
    expect(value.root.querySelector('[data-object-layout="bottom"]')).not.toBeNull();
    const properties = value.root.querySelector<HTMLButtonElement>("[data-object-properties]")!;
    properties.focus();
    properties.click();
    await nextTick();

    const sheet = value.root.querySelector<HTMLElement>('[data-object-inspector-layout="sheet"]')!;
    expect(sheet.getAttribute("aria-modal")).toBe("true");
    await vi.waitFor(() => expect(document.activeElement).toBe(
      sheet.querySelector("[data-object-sheet-back]")
    ));
    const section = sheet.querySelector<HTMLElement>(
      '[data-object-inspector-section="geometry"]'
    )!;
    expect(section).not.toBeNull();
    expect(section.classList.contains("qk-inspector__section"))
      .toBe(true);
    expect(sheet.querySelector('[data-mixed="true"]')).not.toBeNull();
    expect(sheet.textContent).toContain("px");
    expect(sheet.textContent).toContain("输入宽度以替换混合值");
    expect(sheet.querySelector('[role="tablist"]')).not.toBeNull();
    const inspectorAction = sheet.querySelector<HTMLButtonElement>(
      '[data-object-inspector-action="action-0"]'
    )!;
    expect(inspectorAction.classList.contains("qk-button")).toBe(true);
    inspectorAction.click();
    await vi.waitFor(() => expect(value.root.dataset.commandCount).toBe("1"));
    expect(JSON.parse(value.root.dataset.lastPayload ?? "null")).toMatchObject({
      input: { source: "inspector" }
    });
    expect(value.root.querySelector('[data-object-inspector-layout="sheet"]')).not.toBeNull();
    const accessibilityTab = sheet.querySelector<HTMLElement>(
      '[data-object-inspector-tab="accessibility"]'
    )!;
    accessibilityTab.click();
    await nextTick();
    expect(value.mounted.controller.snapshot.activeTabId).toBe("accessibility");
    expect(accessibilityTab.closest('[role="tab"]')?.getAttribute("aria-selected"))
      .toBe("true");

    sheet.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await nextTick();
    expect(value.root.querySelector('[data-object-inspector-layout="sheet"]')).toBeNull();
    expect(document.activeElement).toBe(properties);
  });

  it("keeps two roots, modal focus, and canonical overlay ownership isolated", async () => {
    const first = fixture(390);
    const second = fixture(390);
    first.mounted.controller.openInspector(
      "narrow",
      first.root.querySelector<HTMLButtonElement>("[data-object-properties]")
    );
    second.mounted.controller.openInspector(
      "narrow",
      second.root.querySelector<HTMLButtonElement>("[data-object-properties]")
    );
    await vi.waitFor(() => {
      expect(first.root.querySelector('[role="dialog"]')).not.toBeNull();
      expect(second.root.querySelector('[role="dialog"]')).not.toBeNull();
    });
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    first.root.querySelector<HTMLElement>('[role="dialog"]')?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await nextTick();
    expect(first.root.querySelector('[role="dialog"]')).toBeNull();
    expect(second.root.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
