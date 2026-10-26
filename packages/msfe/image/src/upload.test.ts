// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { image } from "./image";
import { imageAlt, storeImages } from "./upload";
import type { ImageOptions, ImageUploader } from "./types";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

/** @param name - File name. @param type - MIME type. @returns A tiny file. */
const file = (name: string, type = "image/png") => new File([new Uint8Array([1, 2, 3])], name, { type });

/** @param type - Native event name. @param files - Transferred files. @param text - Plain text alongside. @returns Event carrying them. */
function transfer(type: "paste" | "drop", files: File[], text = ""): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const data = { files: Object.assign(files, { item: (index: number) => files[index] }), getData: (kind: string) => kind === "text/plain" ? text : "" };
  Object.defineProperty(event, type === "paste" ? "clipboardData" : "dataTransfer", { value: data });
  return event;
}

/** @param markdown - Initial source. @param options - Image feature options. @param readOnly - Read-only editor. @returns Mounted editor with its content element. */
function mount(markdown: string, options: ImageOptions = {}, readOnly = false) {
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), markdown, readOnly, extensions: [image(options)] });
  editors.push(editor);
  return { editor, content: editor.element.querySelector(".cm-content")! };
}

describe("image storage", () => {
  it("names images from their file and skips failed or unsafe uploads", async () => {
    expect(imageAlt("架构图.png")).toBe("架构图");
    expect(imageAlt("image.png")).toBe("");
    const uploader: ImageUploader = { upload: vi.fn().mockResolvedValueOnce("/assets/a.png").mockRejectedValueOnce(new Error("quota")).mockResolvedValueOnce("javascript:alert(1)") };
    const markdown = await storeImages(uploader, [file("架构图.png"), file("b.png"), file("c.png")], "drop", new AbortController().signal);
    expect(markdown).toBe("![架构图](</assets/a.png>)");
  });

  it("inlines raster images without an uploader and skips SVG", async () => {
    const markdown = await storeImages(undefined, [file("a.png"), file("logo.svg", "image/svg+xml")], "paste", new AbortController().signal);
    expect(markdown).toBe("![a](<data:image/png;base64,AQID>)");
  });
});

describe("image paste and drop", () => {
  it("uploads a pasted screenshot and inserts it at the caret, leaving text pastes alone", async () => {
    const upload = vi.fn(async () => "https://img.example.com/shot.png");
    const { editor, content } = mount("前后", { upload: { upload } });
    editor.run(() => ({ selection: { anchor: 1 } }));
    const pasted = transfer("paste", [file("image.png")]);
    content.dispatchEvent(pasted);
    expect(pasted.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(editor.getMarkdown()).toBe("前![](<https://img.example.com/shot.png>)后"));
    expect(upload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ source: "paste" }));
    content.dispatchEvent(transfer("paste", [file("image.png")], "copied words"));
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("inlines a pasted image as base64 when the host configures no uploader", async () => {
    const { editor, content } = mount("前后");
    editor.run(() => ({ selection: { anchor: 1 } }));
    content.dispatchEvent(transfer("paste", [file("image.png")]));
    await vi.waitFor(() => expect(editor.getMarkdown()).toBe("前![](<data:image/png;base64,AQID>)后"));
  });

  it("writes nothing when read-only, and leaves paste to the host when uploads are off", async () => {
    const upload = vi.fn(async () => "/assets/x.png");
    mount("只读", { upload: { upload } }, true).content.dispatchEvent(transfer("drop", [file("a.png")]));
    expect(upload).not.toHaveBeenCalled();
    const { editor, content } = mount("关闭", { upload: false });
    content.dispatchEvent(transfer("paste", [file("a.png")]));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(editor.getMarkdown()).toBe("关闭");
  });
});
