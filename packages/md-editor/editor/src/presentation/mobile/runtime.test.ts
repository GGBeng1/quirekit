// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { createMdEditor } from "../../editor";

it("unmounts public primitives and removes the instance's breakpoint listener", () => {
  Object.defineProperty(document, "fonts", { configurable: true, value: Object.assign(new EventTarget(), { ready: Promise.resolve() }) });
  const query = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const original = window.matchMedia.bind(window);
  const media = vi.spyOn(window, "matchMedia").mockImplementation(value => value.includes("max-width: 767px") ? query as unknown as MediaQueryList : original(value));
  const host = document.createElement("div"); document.body.append(host);
  const editor = createMdEditor({ parent: host, markdown: "plain text" });
  const overlay = host.querySelector(".qk-selection-handles")!;
  const content = host.querySelector(".cm-content")!;
  try {
    expect(overlay.querySelectorAll("button")).toHaveLength(3);
    expect(content.classList.contains("qk-selection-gesture")).toBe(false);
    expect(query.addEventListener).toHaveBeenCalledTimes(2);
    expect(editor.getMarkdown()).toBe("plain text");
    editor.destroy();
    expect(overlay.isConnected).toBe(false);
    expect(content.classList.contains("qk-selection-gesture")).toBe(false);
    for (const call of query.addEventListener.mock.calls) expect(query.removeEventListener).toHaveBeenCalledWith(...call);
  } finally { editor.destroy(); host.remove(); media.mockRestore(); }
});
