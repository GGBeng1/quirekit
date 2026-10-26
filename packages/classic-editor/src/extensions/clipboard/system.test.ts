import { describe, expect, it, vi } from "vitest";
import { canvasInternalClipboardMime } from "@quirekit/clipboard";
import { readClassicEditorSystemClipboard, writeClassicEditorSystemClipboard } from "./system";

const entries = [[canvasInternalClipboardMime, "{\"slice\":1}"], ["text/html", "<p>x</p>"], ["text/plain", "x"]] as const;

/** Minimal ClipboardItem that records its formats. */
class FakeItem {
  /** @param items - Format blobs. */
  constructor(readonly items: Record<string, Blob>) {}
  /** @returns Present formats. */
  get types() { return Object.keys(this.items); }
  /** @param type - Format. @returns Blob. */
  async getType(type: string) { return this.items[type]!; }
}

/**
 * Creates a document whose window exposes the given clipboard pieces.
 * @param clipboard - Async clipboard stub.
 * @param supports - Whether web custom formats are supported.
 * @returns Document stub and execCommand spy.
 */
function environment(clipboard: Partial<Clipboard> & Record<string, unknown>, supports: boolean) {
  const Item = Object.assign(FakeItem, { supports: () => supports });
  const window = { navigator: { clipboard }, ClipboardItem: Item, Blob } as unknown as Window & typeof globalThis;
  const execCommand = vi.fn(() => false);
  const document = { defaultView: window, addEventListener() {}, removeEventListener() {}, execCommand } as unknown as Document;
  return { document, window, execCommand };
}

describe("menu clipboard", () => {
  it("writes HTML, text and the web custom slice in one async write when supported", async () => {
    const write = vi.fn(async (_items: FakeItem[]) => {});
    const { document, execCommand } = environment({ write } as never, true);
    expect(await writeClassicEditorSystemClipboard(document, entries)).toBe(true);
    expect(write.mock.calls[0]![0][0]!.types.sort()).toEqual([`web ${canvasInternalClipboardMime}`, "text/html", "text/plain"].sort());
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("falls back to the copy command without web custom format support", async () => {
    const write = vi.fn(async () => {});
    const { document, execCommand } = environment({ write } as never, false);
    await writeClassicEditorSystemClipboard(document, entries);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("reads the private slice and asks for unsanitized HTML", async () => {
    const read = vi.fn(async (_options?: unknown) => [new FakeItem({
      [`web ${canvasInternalClipboardMime}`]: new Blob(["{\"slice\":1}"]),
      "text/html": new Blob(["<p>x</p>"]),
      "text/plain": new Blob(["x"])
    })]);
    const { window } = environment({ read } as never, true);
    expect(await readClassicEditorSystemClipboard(window, false)).toEqual({ html: "<p>x</p>", text: "x", internal: "{\"slice\":1}" });
    expect(read).toHaveBeenCalledWith({ unsanitized: ["text/html"] });
  });

  it("does not prompt twice after a refused permission", async () => {
    const read = vi.fn(async () => { throw Object.assign(new Error("denied"), { name: "NotAllowedError" }); });
    const { window } = environment({ read } as never, true);
    expect(await readClassicEditorSystemClipboard(window, false)).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });
});
