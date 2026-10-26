import { createEditor } from "@quirekit/core";
import type { QuireEditor, QuireJSONContent } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { canvasViewExtension, svgViewExtension } from "@quirekit/view";
import { Plugin } from "@quirekit/pm";
import { Accessibility, getAccessibility } from "../src/index";
import { Link } from "@quirekit/extension-link";
import { CustomTitle, structuredContent } from "./capabilities";

let editor: QuireEditor;
/** @param mode - Retained backend. @param state - Installation policy. @param content - Optional structural fixture. @returns Current editor for public probes. */
function create(mode: "canvas" | "svg" = "canvas", state: "absent" | "disabled" | "enabled" = "enabled", content?: QuireJSONContent): QuireEditor {
  editor?.destroy();
  const measurement = document.createElement("canvas").getContext("2d")!;
  const textMeasurer = {
    /** @param text - Text run. @param font - Layout-owned font. @returns Real browser width instead of the headless fallback. */
    measureText(text: string, font: string) { measurement.font = font; return { width: measurement.measureText(text).width }; }
  };
  editor = createEditor({
    element: document.querySelector<HTMLElement>("#editor")!, mode,
    extensions: [StarterKit, Link, CustomTitle, canvasViewExtension({ runtime: { width: 720, height: 600, textMeasurer } }),
      svgViewExtension({ runtime: { width: 720, height: 600, textMeasurer } }),
      ...(state === "absent" ? [] : [Accessibility.configure({ enabled: state === "enabled", readingBlocks: 4 })])],
    content: content ?? { type: "doc", content: Array.from({ length: 30 }, (_, index) => ({
      type: index === 0 ? "heading" : "paragraph", ...(index === 0 ? { attrs: { level: 2 } } : {}),
      content: [{ type: "text", text: index === 0 ? "Canvas and SVG document" : `Paragraph ${index}: Hello 世界 😀 — keyboard and reading context.` }]
    })) }
  });
  return editor;
}

export const fixture = {
  create,
  /** @param mode - Retained backend. @returns Actual consumer of contributed nested semantics. */
  createStructured(mode: "canvas" | "svg") { return create(mode, "enabled", structuredContent); },
  /** @returns Current canonical editor. */
  get editor() { return editor; },
  /** @returns Explicitly installed runtime controller. */
  get controller() { return getAccessibility(editor); },
  /** Reconfigures a PM plugin to exercise mounted service independence. */
  reconfigure(): void { editor.registerPlugin(new Plugin({})); }
};
Object.assign(window, { accessibilityFixture: fixture });
create();
