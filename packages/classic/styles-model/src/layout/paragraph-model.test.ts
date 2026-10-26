import { describe, expect, it } from "vitest";
import { createWordStylesParagraphModelSemantics } from "./paragraph-model";
import { createDefaultWordParagraphStyleRegistry } from "../model";
import { Schema } from "@quirekit/pm";
import type { WordNamedCharacterStyle } from "../model/types";

const model = createWordStylesParagraphModelSemantics();

describe("Word styles paragraph model semantics", () => {
  it("inherits kinsoku from paragraph styles and lets direct false or true win", () => {
    const base = createDefaultWordParagraphStyleRegistry();
    const registry = { ...base, styles: { ...base.styles, Normal: { ...base.styles.Normal!,
      paragraph: { ...base.styles.Normal!.paragraph, eastAsianLayout: { kinsoku: false } } } } };
    const context = model.styleContext({ attrs: { wordStyleRegistry: registry } } as never);
    const inherited = model.resolveParagraph({ attrs: { wordParagraph: null } } as never, context, undefined);
    const direct = model.resolveParagraph({ attrs: { wordParagraph: { eastAsianLayout: { kinsoku: true } } } } as never, context, undefined);
    expect(inherited.avoidPunctuationBreaks).toBe(false);
    expect(direct.avoidPunctuationBreaks).toBe(true);
    expect(inherited.signature).not.toBe(direct.signature);
    expect(model.resolveParagraph({ attrs: { wordParagraph: { eastAsianLayout: { kinsoku: false } } } } as never,
      model.styleContext({ attrs: { wordStyleRegistry: null } } as never), undefined).avoidPunctuationBreaks).toBe(false);
  });

  it("invalidates only paragraphs consuming an edited character definition, including its ancestors", () => {
    const schema = new Schema({ nodes: { doc: { content: "paragraph+", attrs: { wordStyleRegistry: { default: null } } }, paragraph: { content: "text*", attrs: { wordParagraph: { default: null } } }, text: {} }, marks: { wordCharacterStyle: { attrs: { styleId: {} } } } });
    const base = createDefaultWordParagraphStyleRegistry();
    const { paragraph: _paragraph, role: _role, headingLevel: _heading, next: _next, ...metadata } = base.styles.Normal!;
    const character: WordNamedCharacterStyle = { ...metadata, id: "A", name: "A", default: false, kind: "character", text: { color: "#123456" } };
    const registry = { ...base, characterStyles: { A: character, B: { ...character, id: "B", name: "B", basedOn: "A", text: {} } } };
    const styled = schema.node("paragraph", null, [schema.text("styled", [schema.marks.wordCharacterStyle!.create({ styleId: "B" })])]);
    const plain = schema.node("paragraph", null, [schema.text("plain")]);
    const context = model.styleContext(schema.node("doc", { wordStyleRegistry: registry }, [styled, plain]));
    const changed = model.styleContext({ attrs: { wordStyleRegistry: { ...registry, characterStyles: { ...registry.characterStyles, A: { ...character, text: { color: "#654321", fontSize: "16pt" } } } } } } as never);
    expect(model.styleTextSignature(styled, context, undefined)).not.toBe(model.styleTextSignature(styled, changed, undefined));
    expect(model.styleTextSignature(plain, context, undefined)).toBe(model.styleTextSignature(plain, changed, undefined));
  });
  it("reports no style authority for documents without Word Styles", () => {
    const context = model.styleContext({ attrs: {} } as never);

    expect(context).toEqual({ token: undefined, signature: null });
    expect(model.styleTextSignature({ attrs: {} } as never, context, undefined)).toBe("word-paragraph-style-text:none|null");
  });

  it("resolves the built-in registry when the schema declares one", () => {
    const context = model.styleContext({ attrs: { wordStyleRegistry: null } } as never);

    expect(context.token).toBeDefined();
    expect(context.signature).toMatch(/^word-paragraph-styles:/u);
  });

  it("layers table-style text below node styles only without named styles", () => {
    const layer = { text: { fontWeight: "bold" as const } };
    const context = model.styleContext({ attrs: {} } as never);

    expect(model.nodeTextStyle({ fontStyle: "italic" }, { attrs: {} } as never, context, layer))
      .toEqual({ fontWeight: "bold", fontStyle: "italic" });
    expect(model.nodeTextStyle(null, { attrs: {} } as never, context, undefined)).toBeNull();
  });

  it("does not reintroduce default size properties after the named style yields to a table", () => {
    const base = createDefaultWordParagraphStyleRegistry();
    const text = { fontSize: "14pt", fontScale: 1.1, lineHeightScale: 1.1 };
    const registry = { ...base, styles: { ...base.styles, Normal: { ...base.styles.Normal!, text } } };
    const context = model.styleContext({ attrs: { wordStyleRegistry: registry } } as never);
    const node = { attrs: { wordParagraph: null } } as never;
    const relative = model.nodeTextStyle(text, node, context, { text: { fontScale: 0.9 } });
    expect(relative?.fontSize).toBeUndefined();
    expect(relative?.fontScale).toBe(0.9);
    expect(relative?.lineHeightScale).toBeUndefined();
    const absolute = model.nodeTextStyle(text, node, context, { text: { fontSize: "9pt" } });
    expect(absolute?.fontSize).toBe("9pt");
    expect(absolute?.fontScale).toBeUndefined();
    expect(absolute?.lineHeightScale).toBeUndefined();
  });
});
