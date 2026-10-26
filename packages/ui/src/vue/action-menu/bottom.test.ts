// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { QuireKitActionMenuEntry } from "../../components/action-menu/types";
import DrawerRoot from "../drawer/root.vue";
import Bottom from "./bottom.vue";
import type { ActionMenuBottomApi } from "./types";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/** @returns A real Drawer provider containing the private bottom presentation. */
async function mountBottom() {
  const state = reactive({
    busy: false, errorText: "", canGoBack: true,
    actions: [
      { kind: "command", value: "copy", label: "复制", group: "文件" },
      { kind: "branch", value: "move", label: "移动到", children: [], group: "文件" },
      { kind: "command", value: "delete", label: "删除", danger: true, disabled: true, description: "没有权限", group: "管理" },
      { kind: "command", value: "share", label: "分享", group: "文件" }
    ] as readonly QuireKitActionMenuEntry[]
  });
  const view = ref<ActionMenuBottomApi>();
  const activate = vi.fn(), back = vi.fn(), cancel = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render: () => h(DrawerRoot, {
    defaultOpen: true, side: "bottom", modal: false, trapFocus: false, preventScroll: false,
    onCloseRequest: request => { if (state.busy) request.preventDefault(); }
  }, { default: () => h(Bottom, { ...state, title: "文件操作", ref: view, onActivate: activate, onBack: back, onCancel: cancel }) }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  const content = document.querySelector<HTMLElement>(".qk-drawer__content")!;
  return { state, view, activate, back, cancel, content };
}

it("renders one Drawer with adjacent groups, branch decoration, disabled actions and a return path", async () => {
  const { content, activate, back, cancel } = await mountBottom();
  expect(document.querySelectorAll('[data-scope="drawer"][data-part="content"]')).toHaveLength(1);
  expect(content.querySelector('[role="menu"]')).toBeNull();
  expect([...content.querySelectorAll(".qk-action-sheet__group-label")].map(node => node.textContent)).toEqual(["文件", "管理", "文件"]);
  for (const control of [content.querySelector('[aria-label="关闭"]'), content.querySelector('.qk-action-sheet__cancel'), [...content.querySelectorAll('button')].find(node => node.textContent === '返回')]) {
    expect(control?.classList.contains('qk-button--neutral-text')).toBe(true);
  }
  const actions = content.querySelectorAll<HTMLButtonElement>("[data-action-value]");
  expect([...actions].map(node => node.dataset.actionValue)).toEqual(["copy", "move", "delete", "share"]);
  expect(actions[1]!.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  expect(actions[2]!.disabled).toBe(true);
  expect(actions[2]!.hasAttribute("data-danger")).toBe(true);
  actions[2]!.click();
  actions[0]!.click();
  actions[1]!.click();
  expect(activate.mock.calls.map(([value]) => value)).toEqual(["copy", "move"]);
  [...content.querySelectorAll("button")].find(button => button.textContent === "返回")!.click();
  content.querySelector<HTMLButtonElement>(".qk-action-sheet__cancel")!.click();
  expect(back).toHaveBeenCalledOnce();
  expect(cancel).toHaveBeenCalledOnce();
});

it("preserves focused actions through busy and failure while blocking duplicate intents and using one live lane", async () => {
  const { state, content, activate, back, cancel } = await mountBottom();
  const action = content.querySelector<HTMLButtonElement>('[data-action-value="copy"]')!;
  action.focus();
  state.busy = true;
  state.errorText = "上次失败";
  await nextTick();
  expect(document.activeElement).toBe(action);
  expect(action.disabled).toBe(false);
  expect(action.getAttribute("aria-disabled")).toBe("true");
  expect(content.querySelectorAll('[role="status"],[role="alert"]')).toHaveLength(1);
  expect(content.querySelector('[role="status"]')?.textContent).toBe("正在处理…");
  action.click();
  [...content.querySelectorAll("button")].find(button => button.textContent === "返回")!.click();
  content.querySelector<HTMLButtonElement>(".qk-action-sheet__cancel")!.click();
  content.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click();
  expect(activate).not.toHaveBeenCalled();
  expect(back).not.toHaveBeenCalled();
  expect(cancel).not.toHaveBeenCalled();
  expect(content.dataset.state).toBe("open");
  state.busy = false;
  state.errorText = "复制失败，请重试";
  await nextTick();
  expect(content.querySelector('[data-action-value="copy"]')).toBe(action);
  expect(content.querySelectorAll('[role="status"],[role="alert"]')).toHaveLength(1);
  expect(content.querySelector('[role="alert"]')?.textContent).toBe("复制失败，请重试");
  action.click();
  expect(activate).toHaveBeenCalledExactlyOnceWith("copy");
});

it("restores parent focus and scroll after an empty child directory without owning navigation state", async () => {
  const { state, content, view } = await mountBottom();
  const original = state.actions;
  const branch = content.querySelector<HTMLButtonElement>('[data-action-value="move"]')!;
  branch.focus();
  const body = content.querySelector<HTMLElement>(".qk-drawer__body")!;
  body.scrollTop = 84;
  const snapshot = view.value!.captureView();
  expect(snapshot).toEqual({ scrollTop: 84, focusedValue: "move" });
  state.actions = [];
  await view.value!.restoreView({ scrollTop: 0, focusedValue: null });
  expect(document.activeElement).toBe(content);
  expect(content.textContent).toContain("暂无可用操作");
  expect(content.textContent).toContain("返回");
  state.actions = original;
  await view.value!.restoreView(snapshot);
  expect((document.activeElement as HTMLElement).dataset.actionValue).toBe("move");
  expect(body.scrollTop).toBe(84);
  await view.value!.restoreView({ scrollTop: 0, focusedValue: null });
  expect((document.activeElement as HTMLElement).dataset.actionValue).toBe("copy");
  expect(body.scrollTop).toBe(0);
});
