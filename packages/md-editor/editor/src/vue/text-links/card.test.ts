// @vitest-environment happy-dom
import { createApp, h, nextTick, shallowRef } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { textLinks } from "@quirekit/msfe-link";
import MdEditor from "../editor.vue";
import type { MdEditorInstance } from "../types";

const dispose: (() => void)[] = [];
beforeEach(() => {
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve(), load: () => Promise.resolve([]) }) });
});
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); vi.useRealTimers(); });

/** @param link - Presented text link. @param type - Pointer event name. */
function point(link: Element, type: "pointerover" | "pointerout"): void {
  link.dispatchEvent(new PointerEvent(type, { bubbles: true }));
}

describe("text link hover cards", () => {
  it("shows the host card with the shared layout and opens the link destination", async () => {
    vi.useFakeTimers();
    const card = vi.fn(async (text: string) => ({ title: "修复登录失败", subtitle: `${text} · 缺陷`, status: { label: "处理中", tone: "info" as const },
      fields: [{ label: "经办人", value: "小林" }] }));
    const rule = textLinks({ id: "issues", pattern: /CLOUD-\d+/u, href: key => `https://issues.example.com/browse/${key}`, card });
    const element = document.createElement("div"); document.body.append(element);
    const product = shallowRef<MdEditorInstance>();
    const app = createApp({ render: () => h(MdEditor, { markdown: "见 CLOUD-7。\n", extensions: [rule], ref: product }) });
    dispose.push(() => { app.unmount(); element.remove(); });
    app.mount(element); await nextTick(); await vi.advanceTimersByTimeAsync(50);
    const link = element.querySelector("a[data-msfe-text-link]")!;
    expect(link.textContent).toBe("CLOUD-7");

    point(link, "pointerover");
    await vi.advanceTimersByTimeAsync(400); await nextTick();
    const surface = document.querySelector("[data-md-text-link-card]")!;
    expect(card).toHaveBeenCalledWith("CLOUD-7", expect.any(AbortSignal));
    expect(surface.textContent).toContain("CLOUD-7 · 缺陷");
    expect(surface.textContent).toContain("修复登录失败");
    expect(surface.textContent).toContain("经办人 小林");
    expect(surface.querySelector("a")?.getAttribute("href")).toBe("https://issues.example.com/browse/CLOUD-7");

    point(link, "pointerout");
    await vi.advanceTimersByTimeAsync(300); await nextTick();
    expect(document.querySelector("[data-md-text-link-card]")).toBeNull();
  });

  it("shows the same card for an ordinary Markdown link claimed by the rule", async () => {
    vi.useFakeTimers();
    const card = vi.fn(async (text: string) => ({ title: `Issue ${text}` }));
    const rule = textLinks({ id: "issues", pattern: /CLOUD-\d+/u, href: key => `https://issues.example.com/browse/${key}`, card,
      fromHref: url => /^https:\/\/issues\.example\.com\/browse\/(CLOUD-\d+)$/u.exec(url)?.[1] ?? null });
    const element = document.createElement("div"); document.body.append(element);
    const app = createApp({ render: () => h(MdEditor, { markdown: "见[需求说明](https://issues.example.com/browse/CLOUD-9)。\n", extensions: [rule] }) });
    dispose.push(() => { app.unmount(); element.remove(); });
    app.mount(element); await nextTick(); await vi.advanceTimersByTimeAsync(50);
    const link = element.querySelector("a[data-msfe-url]")!;
    expect(link.textContent).toBe("需求说明");
    point(link, "pointerover");
    await vi.advanceTimersByTimeAsync(400); await nextTick();
    expect(card).toHaveBeenCalledWith("CLOUD-9", expect.any(AbortSignal));
    expect(document.querySelector("[data-md-text-link-card]")?.textContent).toContain("Issue CLOUD-9");
  });
});
