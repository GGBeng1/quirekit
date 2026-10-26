// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireEditable from "./editable.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts Editable, optionally inside a language provider.
 * @param props - Editable props.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Mounted host element.
 */
async function mountEditable(props: { readonly label: string } & Record<string, unknown>, locale?: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const editable = () => h(QuireEditable, props);
  const app = createApp({ render: () => locale ? h(QuireLocaleProvider, { locale }, editable) : editable() });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

it("renders the placeholder, edit action and feedback in the provider language", async () => {
  const host = await mountEditable({ label: "Title", invalid: true }, "en");
  expect(host.textContent).toContain("Click to edit");
  expect(host.textContent).toContain("Check this value");
  expect(host.querySelector('[data-part="edit-trigger"]')?.getAttribute("aria-label")).toBe("Edit Title");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps Chinese without a provider", async () => {
  const host = await mountEditable({ label: "标题" });
  expect(host.textContent).toContain("点击编辑");
  expect(host.querySelector('[data-part="edit-trigger"]')?.getAttribute("aria-label")).toBe("编辑标题");
});
