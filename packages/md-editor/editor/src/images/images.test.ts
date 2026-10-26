// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mdImageAlt } from "./source";
import { withMdImageStorage } from "./docx";
import type { MdImageStorage } from "./types";

describe("md-editor image storage", () => {
  it("names images from their file through the shared MSFE helper", () => {
    expect(mdImageAlt("架构图.png")).toBe("架构图");
    expect(mdImageAlt("image.png")).toBe("");
  });

  it("routes Word image storage and export lookup through the editor storage unless set explicitly", async () => {
    const storage: MdImageStorage = { upload: vi.fn(async () => "/assets/w.png"), resolve: vi.fn(async () => "data:image/png;base64,AA==") };
    const options = withMdImageStorage({}, storage);
    expect(await options.storeImage!({ dataUrl: "data:image/png;base64,AQID", alt: "图" })).toBe("/assets/w.png");
    expect(await options.resolveImage!("/assets/w.png")).toBe("data:image/png;base64,AA==");
    const own = async () => "/own.png";
    expect(withMdImageStorage({ storeImage: own }, storage).storeImage).toBe(own);
    expect(withMdImageStorage({}, undefined)).toEqual({});
  });
});
