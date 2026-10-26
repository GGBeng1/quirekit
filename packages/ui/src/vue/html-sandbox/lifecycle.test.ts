// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref } from "vue";
import QuireHtmlSandbox from "./html-sandbox.vue";
const create = vi.hoisted(() => vi.fn());
vi.mock("@quirekit/html-sandbox/browser", () => ({ createHtmlSandbox: create }));
afterEach(() => { create.mockReset(); document.body.replaceChildren(); });
it("delegates source/config changes and unmount to a single controller", async () => {
  const handle = { run: vi.fn(() => true), stop: vi.fn(), destroy: vi.fn(), update: vi.fn(), configure: vi.fn() };
  create.mockReturnValue(handle);
  const html = ref('<button>one</button>');
  const host = document.body.appendChild(document.createElement('div'));
  const app = createApp({ render: () => h(QuireHtmlSandbox, { html: html.value }) });
  app.mount(host);
  await vi.waitFor(() => expect(create).toHaveBeenCalledOnce());
  html.value = '<button>two</button>'; await nextTick();
  expect(handle.update).toHaveBeenLastCalledWith(expect.objectContaining({ html: html.value }));
  host.querySelectorAll<HTMLButtonElement>('[role=tab]')[1]!.click(); await nextTick();
  expect(host.querySelector('pre')?.textContent).toContain(html.value);
  expect(create).toHaveBeenCalledOnce(); expect(handle.run).not.toHaveBeenCalled();
  app.unmount(); expect(handle.destroy).toHaveBeenCalledOnce();
});
it("unmount before a delayed module finishes never mounts a runtime", async () => {
  const host = document.body.appendChild(document.createElement('div'));
  const app = createApp({ render: () => h(QuireHtmlSandbox, { html: 'x' }) });
  app.mount(host); app.unmount(); await nextTick(); await Promise.resolve();
  expect(create).not.toHaveBeenCalled();
});
