// @vitest-environment happy-dom
import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryVersionStore } from "@quirekit/edit-history/memory";
import type { MdVersions } from "../../activity/versions";
import View from "./view.vue";

afterEach(() => { document.body.replaceChildren(); });
/** @returns Settled store promises and Vue updates. */
const settle = async () => { for (let round = 0; round < 5; round++) { await Promise.resolve(); await nextTick(); } };

describe("version list", () => {
  it("switches to versions, saves a named version and lists newest first", async () => {
    const versions = createMemoryVersionStore();
    await versions.create({ documentId: "doc", epoch: "1", sequence: 0, trigger: "import" }, { format: "markdown", value: "seed" });
    const save = vi.fn(async (name?: string) => versions.create({ documentId: "doc", epoch: "1", sequence: 0, trigger: name ? "named" : "auto", ...(name ? { name } : {}) }, { format: "markdown", value: "now" }));
    const controller = { save } as unknown as MdVersions, host = document.body.appendChild(document.createElement("div"));
    const timeline = { store: { list: async () => ({ items: [] }), append: async () => [], get: async () => null }, documentId: "doc", locale: "zh-CN" as const };
    createApp({ render: () => h(View, { timeline, versions: { versions, documentId: "doc", locale: "zh-CN", controller: () => controller, source: () => "now" } }) }).mount(host);
    await settle();
    [...host.querySelectorAll<HTMLElement>("[role=radio], button, label")].find(element => element.textContent?.trim() === "版本")!.click();
    await settle();
    expect(host.querySelector("[data-md-versions]")?.textContent).toContain("导入的版本");
    const input = host.querySelector<HTMLInputElement>("[data-md-versions] input")!;
    input.value = "提交审核前"; input.dispatchEvent(new Event("input"));
    host.querySelector<HTMLFormElement>("[data-md-versions] form")!.requestSubmit();
    await settle();
    expect(save).toHaveBeenCalledWith("提交审核前");
    expect([...host.querySelectorAll(".md-versions__title")].map(title => title.textContent)).toEqual(["提交审核前", "导入的版本"]);
  });
});
