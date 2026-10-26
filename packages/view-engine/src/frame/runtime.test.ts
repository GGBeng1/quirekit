import { createEditor, Extension } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { quireNeutralDocumentProfile } from "../document-profile";
import { createQuireViewEngineRuntime } from "./runtime";

describe("Quire View Engine frame runtime", () => {
  it("keeps cache authority opaque and emits a complete synthetic page frame", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "engine frame" }]
        }]
      }
    });
    const phases: string[] = [];
    const runtime = createQuireViewEngineRuntime({ editor });

    const frame = runtime.buildFrame({
      viewportRect: { x: 0, y: 0, width: 320, height: 200 },
      requirePageDisplayListChunks: true,
      trace: (phase) => phases.push(phase.name)
    });

    expect(Object.keys(runtime).sort()).toEqual([
      "buildFrame",
      "buildTransientFrame"
    ]);
    expect(frame.pageDisplayListChunks?.chunks).toHaveLength(1);
    expect(frame.pageDisplayListChunks?.chunks[0]?.pageRect)
      .toEqual(frame.layoutSnapshot.documentRect);
    expect(phases.indexOf("render:selection-geometry"))
      .toBeLessThan(phases.indexOf("render:display-owner-index"));
    expect(phases.indexOf("render:display-owner-index"))
      .toBeLessThan(phases.indexOf("render:display-list"));
  });

  it("paints page backgrounds with the fill supplied by the page model", () => {
    const PageFillProfile = Extension.create({
      name: "pageFillProfile",
      addDocumentProfiles: () => [{
        id: "page-fill",
        facets: ["page-model"],
        profile: { "page-model": () => ({ ...quireNeutralDocumentProfile.pageModel, pageFill: () => "#123456" }) }
      }]
    });
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false }), PageFillProfile],
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "page" }] }] }
    });
    const frame = createQuireViewEngineRuntime({ editor }).buildFrame({
      viewportRect: { x: 0, y: 0, width: 320, height: 400 },
      pageGeometry: {
        pageRect: { x: 0, y: 0, width: 320, height: 400 },
        bodyRect: { x: 20, y: 20, width: 280, height: 360 }
      }
    });

    expect(frame.displayList.commands).toContainEqual(expect.objectContaining({
      kind: "fill-rect",
      fillStyle: "#123456"
    }));
  });
});
