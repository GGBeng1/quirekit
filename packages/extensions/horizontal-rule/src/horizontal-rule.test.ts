import { QuireEditor } from "@quirekit/core";
import { Document } from "@quirekit/extension-document";
import { Paragraph } from "@quirekit/extension-paragraph";
import { Text } from "@quirekit/extension-text";
import { describe, expect, it } from "vitest";
import { HorizontalRule } from "./horizontal-rule";
import {
  defaultHorizontalRuleStyle,
  horizontalRulePresets,
  parseHorizontalRuleHtml,
  serializeHorizontalRuleHtml
} from "./style";

describe("HorizontalRule", () => {
  it("inserts a visible default rule and leaves a following paragraph", () => {
    const editor = createHorizontalRuleEditor();

    expect(editor.commands.setHorizontalRule()).toBe(true);
    expect(editor.getJSON().content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "horizontalRule",
        attrs: expect.objectContaining(defaultHorizontalRuleStyle)
      }),
      expect.objectContaining({ type: "paragraph" })
    ]));

  });

  it("round-trips canonical styles through semantic HTML", () => {
    const preset = horizontalRulePresets.find(({ id }) => id === "dashed");
    if (preset === undefined) throw new Error("Missing dashed horizontal-rule preset.");
    const style = {
      ...preset.style,
      widthPercent: 60,
      alignment: "right",
      color: "#2563eb"
    } as const;
    const attributes = serializeHorizontalRuleHtml(style);

    expect(attributes).toMatchObject({
      "data-qk-horizontal-rule-variant": "dashed",
      "data-qk-horizontal-rule-width-percent": "60",
      "data-qk-horizontal-rule-alignment": "right"
    });
    expect(parseHorizontalRuleHtml(createHorizontalRuleElement(attributes))).toEqual({
      variant: "dashed",
      widthPercent: 60,
      alignment: "right",
      color: "#2563eb",
      thicknessPt: preset.style.thicknessPt
    });
  });

  it("preserves existing fields across partial updates and chained updates", () => {
    const editor = createHorizontalRuleEditor({ ...defaultHorizontalRuleStyle, variant: "double", thicknessPt: 3 });
    editor.commands.setNodeSelection(0);
    expect(editor.commands.updateHorizontalRule({ color: "#e5484d" })).toBe(true);
    expect(editor.state.doc.firstChild?.attrs).toMatchObject({ variant: "double", thicknessPt: 3, color: "#e5484d" });
    expect(editor.chain().updateHorizontalRule({ widthPercent: 50 }).updateHorizontalRule({ alignment: "right" }).run()).toBe(true);
    expect(editor.state.doc.firstChild?.attrs).toMatchObject({ variant: "double", thicknessPt: 3, color: "#e5484d", widthPercent: 50, alignment: "right" });
    editor.destroy();
  });

  it("imports a plain HTML rule as the visible default style", () => {
    expect(parseHorizontalRuleHtml(createHorizontalRuleElement({})))
      .toEqual(defaultHorizontalRuleStyle);
  });
});

/**
 * Creates one editor containing a single horizontal rule.
 *
 * @param style - Optional canonical style written to the fixture node.
 * @returns Editor ready for layout and serialization assertions.
 */
function createHorizontalRuleEditor(
  style = defaultHorizontalRuleStyle
): QuireEditor {
  return new QuireEditor({
    extensions: [Document, Paragraph, Text, HorizontalRule],
    content: {
      type: "doc",
      content: [{ type: "horizontalRule", attrs: { ...style } }]
    }
  });
}

/**
 * Creates the minimal HTML element surface consumed by the style parser.
 *
 * @param attributes - Serialized horizontal-rule attributes.
 * @returns HTMLElement-compatible attribute and style reader.
 */
function createHorizontalRuleElement(
  attributes: Readonly<Record<string, string>>
): HTMLElement {
  return {
    getAttribute(name: string) {
      return attributes[name] ?? null;
    },
    style: {
      borderTopColor: "",
      borderTopStyle: ""
    }
  } as HTMLElement;
}
