import { createTheme, defaultTheme } from "@quirekit/ui";
import { createEditor, resolveExtensions } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { resolveClassicEditorFeatures } from "../plugin/registry/features";
import {
  classicEditorPreset,
  defaultClassicEditorFeatures
} from "./preset";
import { createClassicEditorDefaultDocument } from "./document";

describe("Classic Editor preset interoperability", () => {
  it("keeps generic feature defaults opaque and product-neutral", () => {
    expect(defaultClassicEditorFeatures).toEqual({});
    expect(resolveClassicEditorFeatures(defaultClassicEditorFeatures, {
      "consumer.inspector": true
    })).toEqual({ "consumer.inspector": true });
  });

  it("starts with the shared Calibri and Noto Serif SC document font theme", () => {
    const document = createClassicEditorDefaultDocument();

    expect(document.attrs?.fontTheme).toEqual({
      body: {
        latin: "Calibri",
        eastAsia: "Noto Serif SC",
        complexScript: "Calibri",
        fallbacks: ["Noto Sans SC", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      heading: {
        latin: "Calibri",
        eastAsia: "Noto Serif SC",
        complexScript: "Calibri",
        fallbacks: ["Noto Sans SC", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    });
    expect(document.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph"
    ]);
  });

  it("uses only generic starter-kit schema and behavior by default", () => {
    const extensions = classicEditorPreset.resolveExtensions({
      features: { table: true, drawing: true, review: false },
      theme: defaultTheme,
      workspaceViewport: {} as HTMLElement,
      backend: "canvas",
      canvasRuntime: {},
      svgRuntime: {}
    });
    const names = resolveExtensions(extensions).map((extension) => extension.name);

    expect(names).toContain("trailingNode");
    expect(names.some((name) => name.startsWith("word"))).toBe(false);
  });

  it.each(["light", "dark"] as const)("shares concrete %s selection and object colors with both backends", (scheme) => {
    const theme = createTheme({ scheme, sources: { primary: "#7257d5" } });
    const extensions = resolveExtensions(classicEditorPreset.resolveExtensions({
      features: {}, theme, workspaceViewport: {} as HTMLElement,
      backend: "canvas", canvasRuntime: {}, svgRuntime: {}
    }));
    for (const name of ["canvas-view", "svg-view"]) {
      const extension = extensions.find((candidate) => candidate.name === name);
      expect(extension?.options.runtime.surfaceConfig.selection.fillStyle)
        .toBe(theme.color.selection.document);
      expect(extension?.options.runtime.surfaceConfig.objectSelection)
        .toEqual({
          outlineStrokeStyle: theme.color.action.primary,
          handleFillStyle: theme.color.surface.page,
          handleStrokeStyle: theme.color.action.primary
        });
      expect(extension?.options.runtime.viewportPadding).toEqual({
        left: 0,
        top: 16,
        right: 0,
        bottom: 16
      });
    }
  });

  it("merges host object-selection overrides without dropping theme defaults", () => {
    const theme = createTheme({ sources: { primary: "#7257d5" } });
    const extensions = resolveExtensions(classicEditorPreset.resolveExtensions({
      features: {}, theme, workspaceViewport: {} as HTMLElement,
      backend: "canvas",
      canvasRuntime: {
        surfaceConfig: {
          objectSelection: { handleFillStyle: "#112233" }
        }
      },
      svgRuntime: {}
    }));
    const canvas = extensions.find(candidate => candidate.name === "canvas-view");

    expect(canvas?.options.runtime.surfaceConfig.objectSelection).toEqual({
      outlineStrokeStyle: theme.color.action.primary,
      handleFillStyle: "#112233",
      handleStrokeStyle: theme.color.action.primary
    });
  });

  it("does not install Word product surfaces", () => {
    const plugins = classicEditorPreset.plugins ?? [];
    const contributions = plugins.flatMap((plugin) => plugin.contributions ?? []);

    expect(contributions.map((item) => item.id)).not.toContain("ruler.section-margins");
    expect(contributions.map((item) => item.id)).not.toContain("paragraph-settings");
  });

  it("refreshes the same paint objects without changing history or host overrides", () => {
    const canvasRuntime = { surfaceConfig: { selection: { fillStyle: "#123456" } } };
    const editor = createEditor({ extensions: classicEditorPreset.resolveExtensions({
      features: {}, theme: defaultTheme, workspaceViewport: {} as HTMLElement,
      backend: "canvas", canvasRuntime, svgRuntime: {},
    }) });
    const surfaces = editor.extensions.filter(extension => /^(canvas|svg)-view$/u.test(extension.name))
      .map(extension => extension.options.runtime.surfaceConfig);
    editor.commands.insertContent("Retain history");
    const document = editor.state.doc;
    const theme = createTheme({ scheme: "dark", sources: { primary: "#7257d5" } });
    classicEditorPreset.updatePresentation!({ editor, theme, locale: "en", canvasRuntime, svgRuntime: {} });
    expect(surfaces[0].selection.fillStyle).toBe("#123456");
    expect(surfaces[1].selection.fillStyle).toBe(theme.color.selection.document);
    for (const surface of surfaces) {
      expect(surface.objectSelection.handleFillStyle).toBe(theme.color.surface.page);
      expect(surface.invisibleCharacters.pageBreakLabel).toBe("Page break");
    }
    expect(editor.state.doc).toBe(document);
    expect(editor.commands.undo()).toBe(true);
    editor.destroy();
  });
});
