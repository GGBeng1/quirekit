// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mountProse } from "./fixtures";

describe("streamed reading semantics", () => {
  it("repairs earlier links using first definitions, including footnote bodies and ambiguous labels", async () => {
    const content = "stable paragraph\n\n[foo][bar][baz] [文档][api] [^x] [^x]\n\n";
    const view = mountProse({ content, status: "receiving" });
    await vi.waitFor(() => expect(view.root.querySelector("p")?.textContent).toBe("stable paragraph"));
    const first = view.root.querySelector("p");
    await view.update({ content: content + "[^x]: 脚注 [文档][api]\n\n[baz]: /target\n[api]: /first\n[api]: /wrong", status: "complete" });
    expect(view.root.querySelector("p")).toBe(first);
    expect(view.root.querySelector('a[href="/target"]')?.textContent).toBe("bar");
    expect(view.root.textContent).toContain("[foo]");
    expect(view.root.querySelectorAll('a[href="/first"]')).toHaveLength(2);
    expect(view.root.querySelectorAll('a[href="/wrong"]')).toHaveLength(0);
    const ids = [...view.root.querySelectorAll("[id]")].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(view.root.querySelectorAll("sup")).toHaveLength(2);
    for (const link of view.root.querySelectorAll('a[href^="#"]')) {
      expect(ids).toContain(link.getAttribute("href")!.slice(1));
    }
    expect(view.errors).not.toHaveBeenCalled(); expect(view.unhandled).not.toHaveBeenCalled();
  });

  it("shows exact code while the fence is still open and preserves it after stopping", async () => {
    const view = mountProse({ content: "```ts\na\nb", status: "receiving" });
    await vi.waitFor(() => expect(view.root.querySelector("pre code")?.textContent).toBe("a\nb"));
    await view.update({ status: "stopped" });
    expect(view.root.querySelector("pre code")?.textContent).toBe("a\nb");
    await view.update({ content: "```ts\na\nb\n```", status: "complete" });
    expect(view.root.querySelector("pre code")?.textContent).toBe("a\nb");
  });

  it("keeps HTML inert and rejects disguised unsafe destinations", async () => {
    const content = '<script>window.bad=1</script>\n\n<img src=x onerror="bad()">\n\n'
      + '[evil](javascript:alert%281%29) [entity](jav&#x61;script:bad) ![bad](data:image/svg+xml,bad) [safe](https://example.com)';
    const view = mountProse({ content });
    await vi.waitFor(() => expect(view.root.querySelector('a[href="https://example.com"]')).not.toBeNull());
    expect(view.root.querySelectorAll("script, img, [onerror]")).toHaveLength(0);
    expect(view.root.querySelectorAll("a")).toHaveLength(1);
    expect(view.root.textContent).toContain("<script>window.bad=1</script>");
    expect(view.errors).not.toHaveBeenCalled();
  });
});
