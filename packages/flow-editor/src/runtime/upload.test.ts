import { describe, expect, it, vi } from "vitest";
import { createFlowchartEmbed, readFlowchartEmbed } from "@quirekit/flowchart";
import { storeFlowchartPreview } from "./upload";
import type { FlowchartPreviewUpload } from "../types";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
const saved = readFlowchartEmbed({ ...createFlowchartEmbed("f", "架构"), preview: { dataUrl: png, width: 10, height: 20 } });

describe("flowchart preview upload", () => {
  it("replaces the inline preview with the stored address", async () => {
    const upload = vi.fn<FlowchartPreviewUpload>(async image => (expect(image.type).toBe("image/png"), "/assets/f.png"));
    const next = await storeFlowchartPreview(saved, upload, new AbortController().signal);
    expect(next).toMatchObject({ version: 2, preview: { url: "/assets/f.png", width: 10, height: 20 } });
    expect(upload.mock.calls[0]![1].name).toBe("架构");
  });
  it("keeps the inline preview without storage or when the upload fails", async () => {
    expect(await storeFlowchartPreview(saved, undefined, new AbortController().signal)).toBe(saved);
    expect(await storeFlowchartPreview(saved, async () => { throw new Error("offline"); }, new AbortController().signal)).toBe(saved);
  });
  it("rejects when the dialog closes during the upload", async () => {
    const lifetime = new AbortController();
    await expect(storeFlowchartPreview(saved, async () => { lifetime.abort(); throw new Error("aborted"); }, lifetime.signal)).rejects.toThrow("aborted");
  });
});
