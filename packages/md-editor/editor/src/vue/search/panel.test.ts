// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, shallowRef } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SearchAction, SearchPanelProps } from "@quirekit/msfe-core";
import { mdLocaleKey } from "../context";
import SearchPanel from "./panel.vue";
import { MD_SEARCH_MODE_EVENT } from "./mode";

/** Panel state the test drives like the editor bridge does. */
type MutablePanelProps = { -readonly [Key in keyof SearchPanelProps]: SearchPanelProps[Key] };

const dispose: (() => void)[] = [];
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); });

/**
 * @param overrides - Initial panel state.
 * @returns Mounted panel with mutable props and the actions it ran.
 */
async function mountPanel(overrides: Partial<SearchPanelProps> = {}) {
  const actions: SearchAction[] = [];
  const view: MutablePanelProps = reactive<MutablePanelProps>({
    query: { search: "", replace: "", caseSensitive: false, regexp: false, wholeWord: false },
    matches: { total: 0, current: 0, limited: false }, valid: true, readOnly: false, composing: false,
    setQuery: vi.fn(() => true), run: (action: SearchAction) => { actions.push(action); return true; }, phrase: key => key,
    ...overrides,
  });
  const editor = document.createElement("div"); editor.className = "cm-editor";
  const host = document.createElement("div"); host.className = "msfe-search-panel"; editor.append(host); document.body.append(editor);
  const app = createApp({ render: () => h(SearchPanel, { view }) });
  app.provide(mdLocaleKey, shallowRef("zh-CN"));
  app.mount(host);
  dispose.push(() => { app.unmount(); editor.remove(); });
  await nextTick();
  const status = () => host.querySelector(".md-search__status")!.textContent;
  return { host, view, actions, status };
}

describe("MD Editor search panel", () => {
  it("reports idle, counted, current, empty and invalid states", async () => {
    const panel = await mountPanel();
    expect(panel.status()).toBe("输入内容开始查找");
    panel.view.query = { ...panel.view.query, search: "md" };
    panel.view.matches = { total: 12, current: 0, limited: false }; await nextTick();
    expect(panel.status()).toBe("找到 12 个匹配项");
    panel.view.matches = { total: 1000, current: 3, limited: true }; await nextTick();
    expect(panel.status()).toBe("第 3 / 1000+ 项");
    panel.view.matches = { total: 0, current: 0, limited: false }; await nextTick();
    expect(panel.status()).toBe("未找到匹配项");
    panel.view.valid = false; await nextTick();
    expect(panel.status()).toBe("正则表达式无效");
  });

  it("moves with Enter and Shift+Enter in the find field", async () => {
    const panel = await mountPanel({ query: { search: "md", replace: "", caseSensitive: false, regexp: false, wholeWord: false } });
    const input = panel.host.querySelector<HTMLInputElement>("input[name=search]")!;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    expect(panel.actions).toEqual(["next", "previous"]);
  });

  it("reports a replace-all result until matches reappear", async () => {
    const panel = await mountPanel({ query: { search: "md", replace: "MD", caseSensitive: false, regexp: false, wholeWord: false }, matches: { total: 5, current: 1, limited: false } });
    panel.host.dispatchEvent(new CustomEvent(MD_SEARCH_MODE_EVENT, { detail: "replace" })); await nextTick();
    const replaceAll = [...panel.host.querySelectorAll("button")].find(button => button.textContent?.trim() === "全部替换")!;
    replaceAll.click(); panel.view.matches = { total: 0, current: 0, limited: false }; await nextTick();
    expect(panel.actions).toContain("replaceAll");
    expect(panel.status()).toBe("已替换 5 处");
    panel.view.matches = { total: 5, current: 0, limited: false }; await nextTick();
    expect(panel.status()).toBe("找到 5 个匹配项");
  });

  it("offers no replacement while read-only", async () => {
    const panel = await mountPanel({ readOnly: true });
    panel.host.dispatchEvent(new CustomEvent(MD_SEARCH_MODE_EVENT, { detail: "replace" })); await nextTick();
    expect(panel.host.querySelector("input[name=replace]")).toBeNull();
    expect(panel.host.querySelector(".qk-segmented")).toBeNull();
  });
});
