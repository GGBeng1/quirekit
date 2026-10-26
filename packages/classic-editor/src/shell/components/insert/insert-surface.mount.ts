// @vitest-environment happy-dom
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createClassicEditorInsertSurfaceFixture,
  type ClassicEditorInsertSurfaceFixture
} from "./insert-surface.fixture";

const fixtures: ClassicEditorInsertSurfaceFixture[] = [];

/**
 * Creates one fixture and retains it for deterministic cleanup.
 *
 * @param width - Root-local width in CSS pixels.
 * @param locale - Optional product interface locale.
 * @returns Mounted root-local Insert fixture.
 */
function fixture(
  width: number,
  locale: "zh-CN" | "en" = "zh-CN"
): ClassicEditorInsertSurfaceFixture {
  const value = createClassicEditorInsertSurfaceFixture(document, width, locale);
  fixtures.push(value);
  return value;
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.mounted.destroy();
  document.body.replaceChildren();
});

describe("Classic Insert mounted surface", () => {
  it("uses a searchable drill-in Sheet at 390 and preserves visible disabled reasons", async () => {
    const { context, trigger, mounted } = fixture(390);
    trigger.focus();
    mounted.handle.open(trigger);
    await nextTick();

    expect(context.root.querySelector('[data-insert-layout="sheet"]')).not.toBeNull();
    expect(context.root.querySelectorAll("[data-insert-group-card]")).toHaveLength(4);
    expect(document.activeElement).toBe(context.root.querySelector('input[type="search"]'));

    context.root.querySelector<HTMLButtonElement>('[data-insert-group-card="media"]')?.click();
    await nextTick();
    const image = context.root.querySelector<HTMLButtonElement>('[data-insert-item="image"]');
    expect(image?.getAttribute("aria-disabled")).toBe("true");
    image?.click();
    await nextTick();
    expect(context.root.textContent).toContain("宿主尚未配置媒体选择器");
  });

  it("does not filter on Chinese IME preedit and commits once composition ends", async () => {
    const { context, trigger, mounted } = fixture(720);
    mounted.handle.open(trigger);
    await nextTick();
    const input = context.root.querySelector<HTMLInputElement>('input[type="search"]')!;

    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    input.value = "表格";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "表格" }));
    await nextTick();
    expect(context.root.querySelectorAll("[data-insert-group-card]")).toHaveLength(4);

    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "表格" }));
    await nextTick();
    expect(context.root.querySelector('[data-insert-item="table"]')).not.toBeNull();
    expect(context.root.querySelector('[data-insert-item="link"]')).toBeNull();
  });

  it("supports group/result roving and renders an explicit empty search state", async () => {
    const { context, trigger, mounted } = fixture(1000);
    mounted.handle.open(trigger);
    await nextTick();
    const inline = context.root.querySelector<HTMLButtonElement>(
      '[data-insert-group-tab="inline"]'
    )!;
    inline.focus();
    inline.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    const structure = context.root.querySelector<HTMLButtonElement>(
      '[data-insert-group-tab="structure"]'
    )!;
    expect(structure.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(structure);

    const input = context.root.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "中文";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "中文" }));
    await nextTick();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await nextTick();
    const first = context.root.querySelector<HTMLButtonElement>('[data-insert-item="table"]')!;
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(
      context.root.querySelector('[data-insert-item="link"]')
    );

    input.value = "没有这个功能";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "没有这个功能" }));
    await nextTick();
    expect(context.root.querySelector(".qk-classic-insert-empty")?.textContent)
      .toContain("没有匹配的内容");
  });

  it("records success and restores the opening trigger on dismissal", async () => {
    const { context, trigger, mounted } = fixture(1000, "en");
    mounted.handle.open(trigger);
    await nextTick();
    context.root.querySelector<HTMLButtonElement>('[data-insert-item="link"]')?.click();
    await vi.waitFor(() => {
      expect(context.root.querySelector(".qk-classic-insert-surface")).toBeNull();
    });

    mounted.handle.open(trigger);
    await nextTick();
    expect(context.root.querySelector('[data-insert-group-tab="recent"]')).not.toBeNull();
    const search = context.root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await vi.waitFor(() => {
      expect(context.root.querySelector(".qk-classic-insert-surface")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("keeps two editor roots and their recent-success state independent", async () => {
    const first = fixture(1000);
    const second = fixture(1000, "en");
    first.mounted.handle.open(first.trigger);
    second.mounted.handle.open(second.trigger);
    await nextTick();
    expect(document.querySelectorAll(".qk-classic-insert-surface")).toHaveLength(2);
    const ids = [...document.querySelectorAll(".qk-classic-insert-results")]
      .map((element) => element.id);
    expect(new Set(ids).size).toBe(2);

    first.context.root.querySelector<HTMLButtonElement>('[data-insert-item="link"]')?.click();
    await vi.waitFor(() => {
      expect(first.context.root.querySelector(".qk-classic-insert-surface")).toBeNull();
    });
    first.mounted.handle.open(first.trigger);
    await nextTick();
    expect(first.context.root.querySelector('[data-insert-group-tab="recent"]')).not.toBeNull();
    expect(second.context.root.querySelector('[data-insert-group-tab="recent"]')).toBeNull();
  });
});
