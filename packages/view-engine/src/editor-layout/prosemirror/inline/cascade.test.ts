import { Schema } from "@quirekit/pm";
import type { QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import { describe, expect, it, vi } from "vitest";
import { prepareInlineStyleCascade } from "./cascade";
import { resolveQuireMarkedFont, resolveQuireMarkedBackgroundColor, resolveQuireMarkedTextDecoration } from "../font";

const schema = new Schema({ nodes: { doc: { content: "text*" }, text: {} }, marks: { direct: {}, named: {} } });
describe("inherited inline style cascade", () => {
  it("resolves each mark once and applies direct formatting after semantic styles despite schema order", () => {
    const resolver = vi.fn<QuireMarkCanvasStyleResolver>(mark => mark.type.name === "named"
      ? { cascade: "inherited", fontWeight: "bold", fontSize: "18pt", color: "#123456" } : { fontWeight: "normal", fontSize: "12pt" });
    const cascade = prepareInlineStyleCascade([schema.marks.direct!.create(), schema.marks.named!.create()], resolver, null);
    expect(resolveQuireMarkedFont("16px Arial", cascade.direct, cascade.resolve, cascade.inherited)).toBe("16px Arial");
    expect(cascade.inherited?.color).toBe("#123456");
    expect(resolver).toHaveBeenCalledTimes(2);
  });
  it("uses the default inline style only without an explicit semantic identity", () => {
    const node: QuireNodeCanvasTextStyle = { fontWeight: "bold", defaultInlineStyle: { fontStyle: "italic" } };
    expect(prepareInlineStyleCascade([], undefined, node).inherited?.fontStyle).toBe("italic");
    const explicit = prepareInlineStyleCascade([schema.marks.named!.create()], () => ({ cascade: "inherited", fontWeight: "normal" }), node);
    expect(explicit.inherited?.fontStyle).toBeUndefined();
  });
  it("keeps shading beneath explicit no-highlight and removes inherited underline", () => {
    const marks = [schema.marks.direct!.create()], resolver: QuireMarkCanvasStyleResolver = () => ({ highlightColor: null, underline: { style: "none" } });
    const base = { backgroundColor: "#123456", highlightColor: "#ffff00", textDecoration: ["underline", "line-through"] as const };
    expect(resolveQuireMarkedBackgroundColor(marks, resolver, base)).toBe("#123456");
    expect(resolveQuireMarkedTextDecoration(marks, resolver, base)).toEqual(["line-through"]);
  });
});
