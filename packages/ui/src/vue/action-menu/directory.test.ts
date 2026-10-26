// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { expect, it, vi } from "vitest";
import Directory from "./directory.vue";
import LocaleProvider from "../locale-provider/locale-provider.vue";

it.each(["zh-CN", "en"] as const)("keeps an accessible search label alongside its localized placeholder (%s)", async locale => {
  const host = document.createElement("div"); document.body.append(host);
  const activate = vi.fn(), query = vi.fn();
  const app = createApp({ render: () => h(LocaleProvider, { locale }, () => h(Directory, {
    searchable: true, layout: "grid", actions: [{ kind: "command", value: "image", label: "Image" }],
    onActivate: activate, "onUpdate:query": query,
  })) }); app.mount(host);
  try {
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!, label = host.querySelector("label")!;
    expect(label.htmlFor).toBe(input.id); expect(label.textContent).toBe(locale === "en" ? "Search actions" : "搜索操作");
    expect(input.placeholder).toBe(locale === "en" ? "Search actions…" : "搜索操作…"); expect(document.activeElement).not.toBe(input);
    input.value = "图"; input.dispatchEvent(new Event("input", { bubbles: true })); await nextTick();
    expect(query).toHaveBeenCalledExactlyOnceWith("图"); expect(activate).not.toHaveBeenCalled();
  } finally { app.unmount(); host.remove(); }
});

it("accepts product query examples and icon decoration without changing action identity", async () => {
  const host = document.createElement("div"); document.body.append(host);
  const activate = vi.fn();
  const app = createApp({ render: () => h(Directory, { searchable: true, searchPlaceholder: "Images, tables…", actions: [{ kind: "command", value: "image", label: "Image" }], onActivate: activate }, {
    icon: ({ action }: { action: { value: string } }) => h("span", { "data-decoration": action.value }),
  }) }); app.mount(host);
  try {
    expect(host.querySelector("input")?.placeholder).toBe("Images, tables…");
    expect(host.querySelector('[data-decoration="image"]')).not.toBeNull();
    host.querySelector<HTMLButtonElement>("button")!.click(); await nextTick(); expect(activate).toHaveBeenCalledExactlyOnceWith("image");
  } finally { app.unmount(); host.remove(); }
});
