// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import type { DataViewEditRequest } from "@quirekit/data-view";
import MdEditor from "../editor.vue";
import type { MdEditorInstance } from "../types";

const workspace = vi.hoisted(() => ({ request: null as DataViewEditRequest | null, closed: false }));
vi.mock("../data-view/open", () => ({
  openMdDataView: (request: DataViewEditRequest) => {
    workspace.request = request;
    return { close: () => { workspace.closed = true; request.release(); } };
  },
}));
let cleanup = (): void => {};
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.replaceChildren(); workspace.request = null; workspace.closed = false; });

/** @param label - Exact public product label. @returns Mounted enabled action. */
async function button(label: string): Promise<HTMLButtonElement> {
  let found: HTMLButtonElement | undefined;
  await vi.waitFor(() => {
    found = [...document.querySelectorAll<HTMLButtonElement>("button")].find(value => !value.disabled
      && (value.getAttribute("aria-label") === label || value.textContent?.trim() === label));
    expect(found).toBeDefined();
  });
  return found!;
}

it("hands a mobile adjacent insertion to the product workspace without canceling its new owner", async () => {
  const originalMatchMedia = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation(query => {
    const media = originalMatchMedia(query);
    Object.defineProperty(media, "matches", { value: query === "(max-width: 767px)" });
    return media;
  });
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve(), load: () => Promise.resolve([]) }) });
  const host = document.createElement("div"); document.body.append(host);
  const product = shallowRef<MdEditorInstance>(), markdown = "| a | b |\n| --- | --- |\n| one | two |";
  const app = createApp({ render: () => h(MdEditor, { ref: product, markdown }) });
  cleanup = () => app.unmount();
  app.mount(host); await nextTick();
  await vi.waitFor(() => expect(product.value?.editor).toBeTruthy());
  const editor = product.value!.editor!;
  editor.setSelection(EditorSelection.single(markdown.indexOf("one") + 1));
  await nextTick();
  (await button("插入")).click(); await nextTick();
  (await button("在表格后插入")).click(); await nextTick();
  (await button("多维表格")).click(); await nextTick();
  await vi.waitFor(() => expect(workspace.request).not.toBeNull());
  expect(workspace.closed).toBe(false);
  expect(editor.getMarkdown()).toBe(markdown);
  expect(editor.history.canUndo).toBe(false);
  workspace.request!.release();
  await nextTick();
  expect(workspace.closed).toBe(true);
});
