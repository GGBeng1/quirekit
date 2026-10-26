// @vitest-environment happy-dom

import { QuireEditor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import {
  WordParagraph,
  defaultWordParagraphFormatting
} from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordStyles } from "../extension";
import {
  createDefaultWordParagraphStyleRegistry,
  type WordNamedParagraphStyle
} from "../model";
import { readWordParagraphStyleSelectionContext } from "../selection";

describe("Word paragraph style commands", () => {
  it("synchronizes imported absolute sizes when a legacy caller changes the scale", () => {
    const editor = createEditor(), registry = createDefaultWordParagraphStyleRegistry();
    const imported = { ...registry.styles.Heading2!, text: { fontSize: "14pt", fontScale: 1.4, lineHeightScale: 1.4 } };
    editor.commands.setWordParagraphStyleRegistry({ registry: { ...registry, styles: { ...registry.styles, Heading2: imported } } });
    expect(editor.commands.updateWordParagraphStyle({ style: { ...imported, text: { ...imported.text, fontScale: 1.8, lineHeightScale: 1.8 } } })).toBe(true);
    expect(editor.state.doc.attrs.wordStyleRegistry.styles.Heading2.text.fontSize).toBe("18pt");
    editor.destroy();
  });

  it("applies one style across selected paragraphs without replacing direct formatting", () => {
    const editor = createEditor();
    editor.view.dispatch(
      editor.state.pm.tr.setSelection(
        TextSelection.create(editor.state.doc, 1, editor.state.doc.content.size - 1)
      )
    );

    expect(editor.commands.applyWordParagraphStyle({
      styleId: "Heading2"
    })).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      styleId: "Heading2",
      outlineLevel: null,
      alignment: "center"
    });
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({
      styleId: "Heading2",
      outlineLevel: null
    });
    expect(readWordParagraphStyleSelectionContext(editor.state)).toMatchObject({
      styleId: "Heading2",
      mixed: false,
      paragraphCount: 2
    });
  });

  it("shows the registry default for paragraphs without an explicit style id", () => {
    const editor = createEditor();
    expect(readWordParagraphStyleSelectionContext(editor.state)).toMatchObject({
      styleId: "Normal",
      style: { role: "body" },
      mixed: false
    });
  });

  it("replaces the document registry atomically and rejects missing styles", () => {
    const editor = createEditor();
    const registry = createDefaultWordParagraphStyleRegistry();
    const renamed = {
      ...registry,
      styles: {
        ...registry.styles,
        Normal: { ...registry.styles.Normal!, name: "正文" }
      }
    };

    expect(editor.commands.setWordParagraphStyleRegistry({
      registry: renamed
    })).toBe(true);
    expect(editor.state.doc.attrs.wordStyleRegistry.styles.Normal.name)
      .toBe("正文");
    expect(editor.commands.applyWordParagraphStyle({
      styleId: "Missing"
    })).toBe(false);
  });

  it("updates an existing unlocked style without changing its stable id", () => {
    const editor = createEditor();
    const heading2 = createDefaultWordParagraphStyleRegistry()
      .styles.Heading2!;
    const updated: WordNamedParagraphStyle = {
      ...heading2,
      name: "章节标题",
      paragraph: {
        ...heading2.paragraph,
        alignment: "center"
      }
    };

    expect(editor.commands.updateWordParagraphStyle({ style: updated }))
      .toBe(true);
    expect(editor.state.doc.attrs.wordStyleRegistry.styles.Heading2)
      .toMatchObject({
        id: "Heading2",
        name: "章节标题",
        paragraph: { alignment: "center" }
      });
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.attrs.wordStyleRegistry).toBeNull();
  });

  it("rejects updates for missing and locked styles", () => {
    const editor = createEditor();
    const registry = createDefaultWordParagraphStyleRegistry();
    const heading2 = registry.styles.Heading2!;

    expect(editor.commands.updateWordParagraphStyle({
      style: { ...heading2, id: "Missing" }
    })).toBe(false);

    expect(editor.commands.setWordParagraphStyleRegistry({
      registry: {
        ...registry,
        styles: {
          ...registry.styles,
          Heading2: { ...heading2, locked: true }
        }
      }
    })).toBe(true);
    expect(editor.commands.updateWordParagraphStyle({
      style: { ...heading2, name: "Locked update" }
    })).toBe(false);
  });

  it("resets a customized document registry to fresh built-in styles", () => {
    const editor = createEditor();
    const registry = createDefaultWordParagraphStyleRegistry();

    expect(editor.commands.setWordParagraphStyleRegistry({
      registry: {
        ...registry,
        styles: {
          ...registry.styles,
          Normal: { ...registry.styles.Normal!, name: "正文" }
        }
      }
    })).toBe(true);
    expect(editor.commands.resetWordParagraphStyleRegistry()).toBe(true);
    expect(editor.state.doc.attrs.wordStyleRegistry)
      .toEqual(createDefaultWordParagraphStyleRegistry());
    expect(editor.commands.resetWordParagraphStyleRegistry()).toBe(false);
  });
});

/**
 * Creates a two-paragraph editor with direct alignment on the first paragraph.
 *
 * @returns Editor with Word paragraph and named style behavior installed.
 */
function createEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph, WordStyles],
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: {
            wordParagraph: {
              ...defaultWordParagraphFormatting,
              alignment: "center"
            }
          },
          content: [{ type: "text", text: "Alpha" }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Beta" }]
        }
      ]
    }
  });
}
