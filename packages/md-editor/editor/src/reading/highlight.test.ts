// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mountProse } from "./stream/fixtures";

const source = "::: highlight {emoji=💡 color=blue text=red}\nKeep **this** visible.\n\n- one\n:::\n\n::: note Title\nplain\n:::";

describe("highlight reading and export", () => {
  it("renders the shared highlight anatomy in MdProse and keeps other containers unchanged", async () => {
    const view = mountProse({ content: source });
    await vi.waitFor(() => expect(view.root.querySelector("[data-qk-prose-highlight]")).not.toBeNull());
    const block = view.root.querySelector("[data-qk-prose-highlight]")!;
    expect(block.getAttribute("data-qk-prose-highlight")).toBe("blue");
    expect(block.getAttribute("data-qk-prose-highlight-text")).toBe("red");
    expect(block.querySelector(".qk-prose-container__header")?.textContent).toBe("💡");
    expect(block.querySelector(".qk-prose-container__body strong")?.textContent).toBe("this");
    expect(block.querySelector(".qk-prose-container__body li")?.textContent).toBe("one");
    expect(block.textContent).not.toContain("emoji=");
    expect(view.root.querySelector('[data-container="note"]')?.textContent).toContain("Title");
    expect(view.errors).not.toHaveBeenCalled();
  });
});
