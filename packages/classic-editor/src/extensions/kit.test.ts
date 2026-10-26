import { defaultTheme } from "@quirekit/ui";
import {
  createEditor,
  getExtensionField,
  resolveExtensions
} from "@quirekit/core";
import {
  BackgroundColor,
  Color,
  FontFamily,
  FontSize,
  Language,
  LetterSpacing,
  TextStyle
} from "@quirekit/extension-text-style";
import { describe, expect, it } from "vitest";
import { createClassicEditorRegistry } from "../plugin";
import { classicEditorPreset } from "../preset";
import { ClassicEditorKit } from "./kit";
import type { ClassicEditorActionContext } from "../types";
import {
  ClassicEditorBackgroundColor,
  ClassicEditorColor,
  ClassicEditorFontFamily,
  ClassicEditorFontSize,
  ClassicEditorTextStyle
} from "./typography";

const presetContext = {
  features: { table: false, drawing: false, review: false },
  theme: defaultTheme,
  workspaceViewport: {} as HTMLElement,
  backend: "canvas" as const,
  canvasRuntime: {},
  svgRuntime: {}
};

describe("Classic Editor product-aware StarterKit", () => {
  it("retains the base kinds, options, commands, schema, and shortcuts", () => {
    expect(ClassicEditorTextStyle.kind).toBe("mark");
    expect(ClassicEditorTextStyle.name).toBe(TextStyle.name);
    expect(ClassicEditorTextStyle.config.addAttributes)
      .toBe(TextStyle.config.addAttributes);
    expect(ClassicEditorTextStyle.config.parseHTML).toBe(TextStyle.config.parseHTML);
    expect(ClassicEditorTextStyle.config.renderHTML).toBe(TextStyle.config.renderHTML);
    expect(ClassicEditorTextStyle.config.canvasStyle).toBe(TextStyle.config.canvasStyle);
    expect(ClassicEditorTextStyle.config.addCommands).toBe(TextStyle.config.addCommands);
    expect(ClassicEditorFontFamily.kind).toBe("extension");
    expect(ClassicEditorFontFamily.name).toBe(FontFamily.name);
    expect(ClassicEditorFontFamily.options.types).toEqual(FontFamily.options.types);
    expect(ClassicEditorFontFamily.config.addGlobalAttributes)
      .toBe(FontFamily.config.addGlobalAttributes);
    expect(ClassicEditorFontFamily.config.addCommands)
      .toBe(FontFamily.config.addCommands);
    expect(ClassicEditorFontSize.name).toBe(FontSize.name);
    expect(ClassicEditorColor.name).toBe(Color.name);
    expect(ClassicEditorBackgroundColor.name).toBe(BackgroundColor.name);

    const editor = createEditor({
      extensions: [ClassicEditorKit.configure({
        bold: { HTMLAttributes: { "data-owner": "classic" } },
        horizontalRule: { nextNodeType: "heading" },
        undoRedo: { depth: 32 }
      })]
    });
    const extensions = editor.extensions;
    const bold = extensions.find((extension) => extension.name === "bold");
    const italic = extensions.find((extension) => extension.name === "italic");
    const underline = extensions.find((extension) => extension.name === "underline");
    const strike = extensions.find((extension) => extension.name === "strike");
    const highlight = extensions.find((extension) => extension.name === "highlight");
    const horizontalRule = extensions.find(
      (extension) => extension.name === "horizontalRule"
    );
    const undoRedo = extensions.find((extension) => extension.name === "undoRedo");
    const textStyle = extensions.find((extension) => extension.name === "textStyle");
    const fontFamily = extensions.find((extension) => extension.name === "fontFamily");
    const fontSize = extensions.find((extension) => extension.name === "fontSize");
    const letterSpacing = extensions.find(
      (extension) => extension.name === "letterSpacing"
    );
    const language = extensions.find(
      (extension) => extension.name === "language"
    );
    const color = extensions.find((extension) => extension.name === "color");
    const backgroundColor = extensions.find(
      (extension) => extension.name === "backgroundColor"
    );
    const formatting = extensions.find(
      (extension) => extension.name === "formatting"
    );

    expect(extensions.filter((extension) => extension.name === "bold")).toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "horizontalRule"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "undoRedo"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "textStyle"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "fontFamily"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "fontSize"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "letterSpacing"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "language"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "color"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "backgroundColor"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "strike"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "highlight"))
      .toHaveLength(1);
    expect(extensions.filter((extension) => extension.name === "formatting"))
      .toHaveLength(1);
    expect(bold?.kind).toBe("mark");
    expect(italic?.kind).toBe("mark");
    expect(underline?.kind).toBe("mark");
    expect(strike?.kind).toBe("mark");
    expect(highlight?.kind).toBe("mark");
    expect(horizontalRule?.kind).toBe("node");
    expect(undoRedo?.kind).toBe("extension");
    expect(textStyle?.kind).toBe("mark");
    expect(fontFamily?.kind).toBe("extension");
    expect(fontSize?.kind).toBe("extension");
    expect(letterSpacing?.kind).toBe("extension");
    expect(letterSpacing?.name).toBe(LetterSpacing.name);
    expect(language?.kind).toBe("extension");
    expect(language?.name).toBe(Language.name);
    expect(color?.kind).toBe("extension");
    expect(backgroundColor?.kind).toBe("extension");
    expect(formatting?.kind).toBe("extension");
    expect(bold?.options).toMatchObject({
      HTMLAttributes: { "data-owner": "classic" }
    });
    expect(horizontalRule?.options).toMatchObject({ nextNodeType: "heading" });
    expect(undoRedo?.options).toMatchObject({ depth: 32 });
    expect(editor.state.schema.marks.bold).toBeDefined();
    expect(editor.state.schema.marks.italic).toBeDefined();
    expect(editor.state.schema.marks.underline).toBeDefined();
    expect(editor.state.schema.marks.strike).toBeDefined();
    expect(editor.state.schema.marks.highlight).toBeDefined();
    expect(editor.state.schema.marks.textStyle).toBeDefined();
    expect(editor.state.schema.nodes.horizontalRule).toBeDefined();
    expect(typeof editor.commands.toggleBold).toBe("function");
    expect(typeof editor.commands.toggleItalic).toBe("function");
    expect(typeof editor.commands.toggleUnderline).toBe("function");
    expect(typeof editor.commands.toggleStrike).toBe("function");
    expect(typeof editor.commands.setHorizontalRule).toBe("function");
    expect(typeof editor.commands.undo).toBe("function");
    expect(typeof editor.commands.redo).toBe("function");
    expect(typeof editor.commands.setFontFamily).toBe("function");
    expect(typeof editor.commands.unsetFontFamily).toBe("function");
    expect(typeof editor.commands.setFontSize).toBe("function");
    expect(typeof editor.commands.increaseFontSize).toBe("function");
    expect(typeof editor.commands.decreaseFontSize).toBe("function");
    expect(typeof editor.commands.setLetterSpacing).toBe("function");
    expect(typeof editor.commands.unsetLetterSpacing).toBe("function");
    expect(typeof editor.commands.setLanguageSlots).toBe("function");
    expect(typeof editor.commands.setColor).toBe("function");
    expect(typeof editor.commands.setBackgroundColor).toBe("function");
    expect(typeof editor.commands.clearFormatting).toBe("function");
    expect(typeof editor.commands.toggleFormatPainter).toBe("function");
    expect([bold, italic, underline, strike, undoRedo].map((extension) =>
      typeof getExtensionField(extension!, "addKeyboardShortcuts", {
        name: extension!.name,
        options: extension!.options,
        storage: extension!.storage
      })
    )).toEqual(["function", "function", "function", "function", "function"]);
    expect([bold, italic, underline, strike].map((extension) =>
      typeof getExtensionField(extension!, "addSelectionPopupItems", {
        name: extension!.name,
        options: extension!.options,
        storage: extension!.storage
      })
    )).toEqual(["function", "function", "function", "function"]);

    editor.destroy();
  });

  it("binds capability actions to extensions and the shared built-in leading group", () => {
    const extensions = resolveExtensions(
      classicEditorPreset.resolveExtensions(presetContext)
    );
    const registry = createClassicEditorRegistry({
      plugins: classicEditorPreset.plugins ?? [],
      extensions,
      features: presetContext.features
    });
    const pluginContributionIds = new Set(
      classicEditorPreset.plugins?.flatMap((plugin) =>
        plugin.contributions?.map((contribution) => contribution.id) ?? []
      ) ?? []
    );
    const migratedContributionIds = new Set([
      "toolbar.undo",
      "toolbar.redo",
      "home-history",
      "ribbon.undo",
      "ribbon.redo",
      "home-format",
      "ribbon.font-family",
      "ribbon.font-size",
      "ribbon.bold",
      "ribbon.italic",
      "ribbon.underline",
      "ribbon.strike",
      "ribbon.text-highlight",
      "ribbon.text-color",
      "ribbon.background-color",
      "ribbon.format-painter",
      "ribbon.clear-formatting",
      "selection.bold",
      "selection.italic",
      "selection.underline",
      "selection.strike",
      "ribbon.rule"
    ]);

    expect([...migratedContributionIds].filter((id) => pluginContributionIds.has(id)))
      .toEqual(["home-history"]);
    expect(registry.contributions
      .map((contribution) => contribution.id)
      .filter((id) => migratedContributionIds.has(id)))
      .toEqual([
        "home-history",
        "ribbon.undo",
        "ribbon.redo",
        "ribbon.format-painter",
        "ribbon.clear-formatting",
        "home-format",
        "ribbon.font-family",
        "ribbon.font-size",
        "ribbon.bold",
        "ribbon.italic",
        "ribbon.underline",
        "ribbon.strike",
        "ribbon.text-highlight",
        "ribbon.text-color",
        "ribbon.background-color",
        "ribbon.rule",
        "toolbar.undo",
        "toolbar.redo",
        "selection.bold",
        "selection.italic",
        "selection.underline",
        "selection.strike"
    ]);
    const undoToolbar = registry.contributions.find(
      (contribution) => contribution.id === "toolbar.undo"
    );
    const undoRibbon = registry.contributions.find(
      (contribution) => contribution.id === "ribbon.undo"
    );
    expect(undoToolbar).toMatchObject({ kind: "toolbar-action-control" });
    expect(undoRibbon).toMatchObject({ kind: "ribbon-action-control" });
    if (
      undoToolbar?.kind === "toolbar-action-control"
      && undoRibbon?.kind === "ribbon-action-control"
    ) expect(undoToolbar.action).toBe(undoRibbon.action);
    for (const name of ["italic", "strike"] as const) {
      const ribbon = registry.contributions.find((item) => item.id === `ribbon.${name}`);
      const selection = registry.contributions.find((item) => item.id === `selection.${name}`);
      expect(ribbon).toMatchObject({ kind: "ribbon-action-control" });
      expect(selection).toMatchObject({ kind: "selection-popup-item" });
      if (
        ribbon?.kind === "ribbon-action-control"
        && selection?.kind === "selection-popup-item"
        && "action" in selection
      ) {
        expect(ribbon.action).toBe(selection.action);
      }
    }
    expect(registry.contributions.find(item => item.id === "ribbon.underline"))
      .toMatchObject({ kind: "ribbon-widget", toolbar: expect.any(Function) });
    expect(registry.contributions.find(item => item.id === "selection.underline"))
      .toMatchObject({ kind: "selection-popup-item", action: { id: "format.underline" } });
    expect(registry.contributions.find((item) => item.id === "ribbon.format-painter"))
      .toMatchObject({ kind: "ribbon-action-control", action: { id: "format.format-painter" } });
    expect(registry.contributions.find((item) => item.id === "ribbon.clear-formatting"))
      .toMatchObject({ kind: "ribbon-action-control", action: { id: "format.clear-formatting" } });
    expect(pluginContributionIds.has("insert-content")).toBe(true);
    expect(registry.contributions.find(
      (contribution) => contribution.id === "insert-content"
    )).toMatchObject({
      kind: "ribbon-group",
      tabId: "insert"
    });
  });

  it("projects one direct Bold action into ribbon and selection surfaces", () => {
    const editor = createEditor({
      extensions: [ClassicEditorKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [{
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Inherited" }]
        }]
      }
    });
    const registry = createClassicEditorRegistry({
      plugins: classicEditorPreset.plugins ?? [],
      extensions: editor.extensions,
      features: presetContext.features
    });
    const contribution = registry.contributions.find(
      (candidate) => candidate.id === "ribbon.bold"
    );
    const action = contribution?.kind === "ribbon-action-control"
      ? contribution.action
      : undefined;
    const context = { editor } as unknown as ClassicEditorActionContext;
    const selectionContribution = registry.contributions.find(
      (candidate) => candidate.id === "selection.bold"
    );

    expect(action).toBeDefined();
    expect(selectionContribution).toMatchObject({
      kind: "selection-popup-item",
      action
    });
    expect(editor.commands.setTextSelection({ from: 1, to: 10 })).toBe(true);
    expect(action?.isActive?.(context)).toBe(true);
    expect(action?.run(context)).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toEqual([{
      type: "textStyle",
      attrs: expect.objectContaining({ bold: false })
    }]);
    expect(action?.isActive?.(context)).toBe(false);

    editor.destroy();
  });

  it("omits each replaced capability together with its product records", () => {
    const configured = ClassicEditorKit.configure({
      bold: false,
      horizontalRule: false,
      italic: false,
      strike: false,
      underline: false,
      textStyle: false,
      fontFamily: false,
      fontSize: false,
      letterSpacing: false,
      language: false,
      color: false,
      backgroundColor: false,
      formatting: false,
      undoRedo: false
    });
    const extensions = resolveExtensions([configured]);
    const editor = createEditor({ extensions: [configured] });
    const registry = createClassicEditorRegistry({
      plugins: classicEditorPreset.plugins ?? [],
      extensions,
      features: presetContext.features
    });
    const contributionIds = registry.contributions.map(
      (contribution) => contribution.id
    );

    expect(editor.state.schema.marks.bold).toBeUndefined();
    expect(editor.state.schema.marks.italic).toBeUndefined();
    expect(editor.state.schema.marks.underline).toBeUndefined();
    expect(editor.state.schema.marks.strike).toBeUndefined();
    expect(editor.state.schema.marks.textStyle).toBeUndefined();
    expect(editor.state.schema.nodes.horizontalRule).toBeUndefined();
    expect(editor.extensions.some((extension) => extension.name === "undoRedo"))
      .toBe(false);
    expect(editor.extensions.some((extension) => extension.name === "fontFamily"))
      .toBe(false);
    expect(editor.extensions.some((extension) => extension.name === "fontSize"))
      .toBe(false);
    expect(editor.extensions.some((extension) => extension.name === "letterSpacing"))
      .toBe(false);
    expect(editor.extensions.some((extension) => extension.name === "language"))
      .toBe(false);
    expect(editor.extensions.some((extension) => extension.name === "color"))
      .toBe(false);
    expect(editor.extensions.some((extension) => extension.name === "backgroundColor"))
      .toBe(false);
    expect(editor.extensions.some((extension) => extension.name === "formatting"))
      .toBe(false);
    expect(contributionIds).not.toEqual(expect.arrayContaining([
      "home-format",
      "ribbon.font-family",
      "ribbon.font-size",
      "ribbon.text-highlight",
      "ribbon.text-color",
      "ribbon.background-color",
      "ribbon.format-painter",
      "ribbon.clear-formatting",
      "toolbar.undo",
      "toolbar.redo",
      "selection.bold",
      "selection.italic",
      "selection.underline",
      "selection.strike",
      "ribbon.rule"
    ]));
    expect(contributionIds).toContain("home-history");
    expect(contributionIds).toContain("insert-content");

    editor.destroy();
  });

  it("lets the top-level selection-popup profile reorder, omit, or hide Mark data", () => {
    const extensions = resolveExtensions(
      classicEditorPreset.resolveExtensions(presetContext)
    );
    const reordered = createClassicEditorRegistry({
      plugins: classicEditorPreset.plugins ?? [],
      extensions,
      features: presetContext.features,
      ui: {
        selectionPopup: {
          items: ["selection.underline", "selection.bold"]
        }
      }
    });
    const hidden = createClassicEditorRegistry({
      plugins: classicEditorPreset.plugins ?? [],
      extensions,
      features: presetContext.features,
      ui: { selectionPopup: false }
    });

    expect(reordered.contributions
      .filter((contribution) => contribution.kind === "selection-popup-item")
      .map((contribution) => contribution.id))
      .toEqual(["selection.underline", "selection.bold"]);
    expect(hidden.contributions.some(
      (contribution) => contribution.kind === "selection-popup-item"
    )).toBe(false);
  });

  it("exposes compound text controls only from installed capabilities and preserves profile ordering", () => {
    const make = (textStyle: false | undefined, items?: readonly string[]) => createClassicEditorRegistry({
      plugins: classicEditorPreset.plugins ?? [], extensions: resolveExtensions([ClassicEditorKit.configure(textStyle === false ? { textStyle: false } : {})]),
      features: presetContext.features, ...(items ? { ui: { selectionPopup: { items } } } : {})
    }).contributions.filter(item => item.kind === "selection-popup-item");
    const all = make(undefined);
    expect(all.some(item => item.id === "selection.copy")).toBe(false);
    for (const id of ["selection.font-family", "selection.font-size", "selection.text-highlight", "selection.color", "selection.background-color"]) {
      expect(all.find(item => item.id === id)).toMatchObject({ toolbar: expect.any(Function) });
    }
    expect(all.find(item => item.id === "selection.strike")).toMatchObject({ placement: "primary" });
    for (const id of ["selection.superscript", "selection.subscript", "selection.text-highlight", "selection.color", "selection.background-color"]) {
      expect(all.find(item => item.id === id)).toMatchObject({ placement: "secondary" });
    }
    expect(all.find(item => item.id === "selection.format.clear-formatting")).toMatchObject({ placement: "secondary" });
    expect(make(false).some(item => ["selection.font-family", "selection.font-size", "selection.color", "selection.background-color"].includes(item.id))).toBe(false);
    expect(make(undefined, ["selection.color", "selection.bold"]).map(item => item.id)).toEqual(["selection.color", "selection.bold"]);
  });
});
