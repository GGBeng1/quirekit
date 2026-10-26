// @vitest-environment happy-dom
import { createApp } from "vue";
import { describe, expect, it } from "vitest";
import Template from "./fixtures/template.vue";
import { settle } from "./testing";

describe("compiled public form templates", () => {
  it("preserves v-bind update listeners, empty edits, dirty state, save snapshots and reset", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(Template);
    app.mount(host);
    try {
      await settle();
      const input = host.querySelector<HTMLInputElement>('input[name="title"]')!;
      expect(input.value).toBe("季度设计回顾");
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await settle();
      expect(input.value).toBe("");
      expect(host.querySelector("[data-dirty]")?.textContent).toBe("true");
      input.value = "新的设计回顾";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await settle();
      expect(host.querySelector("[data-saved]")?.textContent).toBe("新的设计回顾");
      host.querySelector<HTMLButtonElement>('button[type="button"]')!.click();
      await settle();
      expect(input.value).toBe("季度设计回顾");
      expect(host.querySelector("[data-dirty]")?.textContent).toBe("false");
    } finally { app.unmount(); host.remove(); }
  });

  it("initializes a conditionally visible email input and restores its draft after hiding", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp(Template);
    app.mount(host);
    try {
      await settle();
      expect(host.querySelector<HTMLInputElement>('input[type="email"]')?.value).toBe("design@example.com");
      host.querySelector<HTMLElement>(".qk-switch__control")!.click();
      await settle();
      expect(host.querySelector('input[type="email"]')).toBeNull();
      host.querySelector<HTMLElement>(".qk-switch__control")!.click();
      await settle();
      expect(host.querySelector<HTMLInputElement>('input[type="email"]')?.value).toBe("design@example.com");
    } finally { app.unmount(); host.remove(); }
  });
});
