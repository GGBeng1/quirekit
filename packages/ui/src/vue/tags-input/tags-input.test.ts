// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, expect, it } from "vitest";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
import QuireTagsInput from "./tags-input.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts TagsInput, optionally inside a language provider.
 * @param props - TagsInput props.
 * @param locale - Provider language, or undefined for the built-in default.
 * @returns Mounted host element.
 */
async function mountTags(props: { readonly label: string } & Record<string, unknown>, locale?: string): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const tags = () => h(QuireTagsInput, props);
  const app = createApp({ render: () => locale ? h(QuireLocaleProvider, { locale }, tags) : tags() });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return host;
}

it("renders hints, actions and feedback in the provider language", async () => {
  const host = await mountTags({ label: "Keywords", defaultValue: ["draft"], invalid: true }, "en");
  expect(host.querySelector(".qk-tags-input__input")?.getAttribute("placeholder")).toBe("Type and press Enter to add");
  expect(host.querySelector(".qk-tags-input__clear")?.getAttribute("aria-label")).toBe("Clear all tags");
  expect(host.querySelector(".qk-tags-input__delete")?.getAttribute("aria-label")).toBe("Remove draft");
  expect(host.textContent).toContain("Check the tags");
  expect(host.innerHTML).not.toMatch(/[\p{Script=Han}]/u);
});

it("keeps Chinese without a provider and honors a host placeholder", async () => {
  const host = await mountTags({ label: "关键词", placeholder: "输入关键词", defaultValue: ["草稿"], invalid: true });
  expect(host.querySelector(".qk-tags-input__input")?.getAttribute("placeholder")).toBe("输入关键词");
  expect(host.textContent).toContain("请检查标签内容");
});
