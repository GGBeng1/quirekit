import { describe, expect, it } from "vitest";
import { Schema } from "@quirekit/pm";
import { TextStyle } from "@quirekit/extension-text-style";
import { resolveQuireCanvasGlyphEffects } from "@quirekit/core";
import { styleDeltas } from "./shared";

const schema = new Schema({ nodes: { doc: { content: "text*" }, text: {} },
  marks: { textStyle: { attrs: Object.fromEntries(["outline", "shadow", "emboss", "imprint"].map(key => [key, { default: null }])) } } });

describe("independent glyph-effect overrides", () => {
  it("preserves inherited peers and imported combinations when changing one direct flag", () => {
    const mark = schema.mark("textStyle", { outline: true, emboss: false });
    expect(resolveQuireCanvasGlyphEffects(styleDeltas([mark], TextStyle.config.canvasStyle,
      { glyphEffects: ["shadow", "emboss", "imprint"] }))).toEqual(["outline", "shadow", "imprint"]);
  });

  it("keeps explicit false distinct from absence, and complete legacy replacement valid", () => {
    const absent = schema.mark("textStyle"), off = schema.mark("textStyle", { shadow: false });
    expect(resolveQuireCanvasGlyphEffects(styleDeltas([absent], TextStyle.config.canvasStyle, { glyphEffects: ["shadow"] }))).toEqual(["shadow"]);
    expect(resolveQuireCanvasGlyphEffects(styleDeltas([off], TextStyle.config.canvasStyle, { glyphEffects: ["shadow"] }))).toEqual([]);
    expect(resolveQuireCanvasGlyphEffects(styleDeltas([off], () => ({ glyphEffects: [] }), { glyphEffects: ["shadow"] }))).toEqual([]);
  });
});
