// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { EditorView } from "@quirekit/cm-view";
import { Link } from "../link";
import { textLinks } from "./extension";
import { loadTextLinkCard, matchTextLinkUrl } from "./card";
import { linkifyTextLinks } from "./export";
import type { TextLinkOptions } from "../types";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); vi.useRealTimers(); });

/** @param markdown - Initial source. @param options - Rule under test. @returns Mounted editor. */
function mount(markdown: string, options: TextLinkOptions): MsfeEditor {
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), markdown, mode: "live", extensions: [Link, textLinks(options)] });
  editors.push(editor);
  return editor;
}

/** @param editor - Mounted editor. @returns Text of every presented text link. */
function linked(editor: MsfeEditor): string[] {
  return [...editor.element.querySelectorAll<HTMLAnchorElement>("a[data-msfe-text-link]")].map(anchor => anchor.textContent ?? "");
}

const href = (text: string) => `https://issues.example.com/browse/${text}`;

describe("text links", () => {
  it("links plain matches only, leaving code, links and longer words untouched", () => {
    const editor = mount("修复 CLOUD-12，见 `CLOUD-13` 与 [CLOUD-14](https://a.example) 以及 XCLOUD-15、CLOUD-16a。\n\n```\nCLOUD-17\n```\n",
      { id: "issues", pattern: /CLOUD-\d+/u, href });
    expect(linked(editor)).toEqual(["CLOUD-12"]);
    const anchor = editor.element.querySelector<HTMLAnchorElement>("a[data-msfe-text-link]")!;
    expect(anchor.dataset.msfeUrl).toBe(href("CLOUD-12"));
    expect(editor.getMarkdown()).toContain("修复 CLOUD-12，");
  });

  it("keeps source mode raw", () => {
    const editor = mount("CLOUD-1", { id: "issues", pattern: /CLOUD-\d+/u, href });
    editor.setMode("source");
    expect(linked(editor)).toEqual([]);
    editor.setMode("live");
    expect(linked(editor)).toEqual(["CLOUD-1"]);
  });

  it("verifies visible candidates in one batch and links only existing ones", async () => {
    vi.useFakeTimers();
    const verify = vi.fn(async (texts: readonly string[]) => texts.filter(text => text !== "BUG-2"));
    const options: TextLinkOptions = { id: "issues", pattern: /(?:CLOUD|BUG)-\d+/u, href, verify };
    const editor = mount("CLOUD-1 BUG-2 CLOUD-1", options);
    expect(linked(editor)).toEqual([]);
    await vi.advanceTimersByTimeAsync(300);
    expect(verify).toHaveBeenCalledTimes(1);
    expect([...verify.mock.calls[0]![0]].sort()).toEqual(["BUG-2", "CLOUD-1"]);
    expect(linked(editor)).toEqual(["CLOUD-1", "CLOUD-1"]);

    // A second editor with the same rule reuses the results without another request.
    const other = mount("BUG-2 CLOUD-1", options);
    await vi.advanceTimersByTimeAsync(300);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(linked(other)).toEqual(["CLOUD-1"]);
  });

  it("waits until the caret leaves a candidate that is still being typed", async () => {
    vi.useFakeTimers();
    const verify = vi.fn(async (texts: readonly string[]) => texts);
    const editor = mount("见 ", { id: "issues", pattern: /CLOUD-\d+/u, href, verify });
    const view = EditorView.findFromDOM(editor.element)!;
    editor.focus();
    for (const character of "CLOUD-42") {
      const end = editor.state.doc.length;
      view.dispatch({ changes: { from: end, insert: character }, selection: { anchor: end + 1 } });
      await vi.advanceTimersByTimeAsync(300);
    }
    expect(verify).not.toHaveBeenCalled();
    view.dispatch({ changes: { from: editor.state.doc.length, insert: "。" }, selection: { anchor: editor.state.doc.length + 1 } });
    await vi.advanceTimersByTimeAsync(300);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0]![0]).toEqual(["CLOUD-42"]);
    expect(linked(editor)).toEqual(["CLOUD-42"]);
  });

  it("retries a failed batch on the next change instead of caching the failure", async () => {
    vi.useFakeTimers();
    const verify = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(["CLOUD-9"]);
    const editor = mount("CLOUD-9", { id: "issues", pattern: /CLOUD-\d+/u, href, verify });
    await vi.advanceTimersByTimeAsync(300);
    expect(linked(editor)).toEqual([]);
    editor.replaceDocument("CLOUD-9 ", "retry");
    await vi.advanceTimersByTimeAsync(300);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(linked(editor)).toEqual(["CLOUD-9"]);
  });

  it("loads hover cards through the rule id and caches successful results only", async () => {
    const card = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ title: "Fix login", status: { label: "Open", tone: "info" } });
    const editor = mount("CLOUD-7", { id: "issues", pattern: /CLOUD-\d+/u, href, card });
    const signal = new AbortController().signal;
    await expect(loadTextLinkCard(editor.state, "issues", "CLOUD-7", signal)).rejects.toThrow("offline");
    expect(await loadTextLinkCard(editor.state, "issues", "CLOUD-7", signal)).toEqual({ title: "Fix login", status: { label: "Open", tone: "info" } });
    await loadTextLinkCard(editor.state, "issues", "CLOUD-7", signal);
    expect(card).toHaveBeenCalledTimes(2);
    expect(await loadTextLinkCard(editor.state, "other", "CLOUD-7", signal)).toBeNull();
  });

  it("maps ordinary link destinations back to a rule for its card", () => {
    const editor = mount("[说明](https://issues.example.com/browse/CLOUD-8)", { id: "issues", pattern: /CLOUD-\d+/u, href,
      card: async () => null, fromHref: url => /\/browse\/(CLOUD-\d+)$/u.exec(url)?.[1] ?? null });
    expect(matchTextLinkUrl(editor.state, "https://issues.example.com/browse/CLOUD-8")).toEqual({ id: "issues", text: "CLOUD-8" });
    expect(matchTextLinkUrl(editor.state, "https://example.com/")).toBeNull();
  });

  it("writes verified matches as Markdown links on export only for opted-in rules", async () => {
    const verify = vi.fn(async (texts: readonly string[]) => texts.filter(text => text !== "CLOUD-2"));
    const editor = mount("修复 CLOUD-1 与 CLOUD-2，`CLOUD-3` 和 [CLOUD-4](https://a.example) 保持原样。", {
      id: "issues", pattern: /CLOUD-\d+/u, href, verify, exportLinks: true });
    expect(await linkifyTextLinks(editor.state)).toBe(`修复 [CLOUD-1](${href("CLOUD-1")}) 与 CLOUD-2，\`CLOUD-3\` 和 [CLOUD-4](https://a.example) 保持原样。`);
    expect(editor.getMarkdown()).toContain("修复 CLOUD-1 与");
    const plain = mount("CLOUD-5", { id: "plain", pattern: /CLOUD-\d+/u, href });
    expect(await linkifyTextLinks(plain.state)).toBe("CLOUD-5");
  });
});
