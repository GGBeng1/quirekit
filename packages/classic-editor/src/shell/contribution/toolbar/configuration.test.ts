// @vitest-environment happy-dom
import { QuireToolbarAction } from "@quirekit/ui/vue";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorRibbonItemContribution } from "../../../types";
import { mountClassicToolbar } from "./fixture";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));
const undo: ClassicEditorRibbonItemContribution = {
  kind: "ribbon-control", id: "undo", groupId: "format", label: "Undo", behavior: { execute: () => true }
};

it("projects controls into one public Toolbar and retains third-party inline widget injection", async () => {
  const widget: ClassicEditorRibbonItemContribution = {
    kind: "ribbon-widget", id: "extension", groupId: "format",
    component: defineComponent({ render: () => h("div", [h("input", { "aria-label": "Extension field" }), h(QuireToolbarAction, { label: "Extension action" })]) })
  };
  const fixture = await mountClassicToolbar([undo, widget], "menu");
  cleanup.push(fixture.dispose);
  expect(fixture.host.querySelectorAll('[role="toolbar"]')).toHaveLength(1);
  expect(fixture.host.querySelector("[data-ribbon-menu]")).toBeNull();
  expect(fixture.host.querySelector('[aria-label="Extension field"]')).not.toBeNull();
  const action = fixture.host.querySelector<HTMLButtonElement>('[data-action="undo"]')!;
  action.focus();
  action.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await nextTick();
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Extension action");
  action.click();
  await nextTick();
  expect(fixture.executeContribution).toHaveBeenCalledTimes(1);
});

it("keeps public menu ownership, checkbox semantics and closes only after successful execution", async () => {
  const fixture = await mountClassicToolbar([undo, {
    kind: "ribbon-control", id: "bold", groupId: "format", label: "Bold",
    behavior: { execute: () => true, isActive: () => true }
  }], "menu");
  cleanup.push(fixture.dispose);
  const trigger = fixture.host.querySelector<HTMLButtonElement>('[data-ribbon-menu="format"]')!;
  fixture.sibling.setVisible(true);
  trigger.click();
  expect(fixture.sibling.isVisible()).toBe(false);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  await nextTick();
  await nextTick();
  const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
  expect(menu).not.toBeNull();
  expect(menu.getAttribute("lang")).toBe("en");
  expect(menu.getAttribute("data-qk-classic-overlay")).toBe(trigger.getAttribute("data-qk-classic-overlay"));
  expect(menu.querySelectorAll("[data-qk-toolbar-item]")).toHaveLength(0);
  expect(menu.querySelector('[data-value="bold"]')?.getAttribute("aria-checked")).toBe("true");
  fixture.executeContribution.mockResolvedValueOnce(false);
  menu.querySelector('[data-value="undo"]')!.dispatchEvent(new CustomEvent("menu:select", { bubbles: true }));
  await nextTick();
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  menu.querySelector<HTMLElement>('[data-value="bold"]')!.click();
  await vi.waitFor(() => expect(fixture.executeContribution).toHaveBeenCalledTimes(2));
  await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
});

it("refreshes availability and disclosure state from the latest context without creating a second popup", async () => {
  const fixture = await mountClassicToolbar([{
    kind: "ribbon-control", id: "panel", groupId: "format", label: { en: "Review", "zh-CN": "审阅" },
    interaction: "disclosure", behavior: { execute: () => true, isActive: context => context.locale === "zh-CN" }
  }]);
  cleanup.push(fixture.dispose);
  const trigger = fixture.host.querySelector<HTMLButtonElement>('[data-action="panel"]')!;
  trigger.click();
  await nextTick();
  expect(fixture.executeContribution).toHaveBeenCalledTimes(1);
  expect(document.querySelector('[data-scope="popover"][data-part="content"]')).toBeNull();
  expect(trigger.hasAttribute("aria-haspopup")).toBe(false);
  fixture.model.context = {
    ...fixture.model.context!, locale: "zh-CN",
    instance: { ...fixture.model.context!.instance, canExecuteContribution: () => false }
  };
  await nextTick();
  expect(fixture.host.querySelector('[data-action="panel"]')).toBe(trigger);
  expect(trigger.getAttribute("aria-label")).toBe("审阅");
  expect(trigger.getAttribute("aria-disabled")).toBe("true");
  trigger.click();
  await nextTick();
  expect(fixture.executeContribution).toHaveBeenCalledTimes(1);
});
