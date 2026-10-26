import { describe, expect, it } from "vitest";
import { resolveWordStylesNodeTextStyle } from "../extension";
import {
  createDefaultWordParagraphStyleRegistry,
  createWordParagraphStyleSelectorItems,
  defaultWordBodyStyleId
} from "./index";

describe("Word paragraph style defaults", () => {
  it("lets a new document clear heading typography back to inheritance", () => {
    const registry = createDefaultWordParagraphStyleRegistry();
    const next = { ...registry, styles: { ...registry.styles, Heading1: { ...registry.styles.Heading1!, text: {} } } };
    expect(resolveWordStylesNodeTextStyle(next, { styleId: "Heading1" })).toMatchObject({ fontScale: 1, lineHeightScale: 1, fontWeight: "normal" });
    const { textPropertiesVersion: _version, ...legacy } = next;
    expect(resolveWordStylesNodeTextStyle(legacy, { styleId: "Heading1" })).toMatchObject({ fontScale: 2, fontWeight: "bold" });
  });
  it("keeps nine canonical headings but exposes only six in the compact selector", () => {
    const registry = createDefaultWordParagraphStyleRegistry();
    const selector = createWordParagraphStyleSelectorItems(registry);

    expect(registry.defaultParagraphStyleId).toBe(defaultWordBodyStyleId);
    expect(Object.keys(registry.styles)).toHaveLength(12);
    expect(registry.styles.Heading9).toMatchObject({
      role: "heading",
      headingLevel: 9,
      quickFormat: false
    });
    expect(selector.map((item) => item.styleId)).toEqual([
      "Normal",
      "Title",
      "Subtitle",
      "Heading1",
      "Heading2",
      "Heading3",
      "Heading4",
      "Heading5",
      "Heading6"
    ]);
  });
});
