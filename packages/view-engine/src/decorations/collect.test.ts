import { Decoration, DecorationSet, EditorState, Plugin, Schema } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import { markQuireDomOnlyDecorations } from "@quirekit/core";
import { collectQuireDecorations } from "./collect";
import type { QuireDecorationSourceView } from "./types";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: {}
  }
});

describe("collectQuireDecorations", () => {
  it("skips decorations reserved for DOM-rendered views", () => {
    const state = EditorState.create({
      doc: schema.node("doc", null, [schema.node("paragraph", null, schema.text("ab"))])
    });
    const set = DecorationSet.create(state.doc, [
      Decoration.node(0, 4, { style: "background-color: red" }, { quireRenderTarget: "dom" }),
      Decoration.inline(1, 2, { class: "painted" })
    ]);
    const view = {
      someProp: (_name: string, callback: (provider: unknown) => unknown) => callback(() => set)
    } as unknown as QuireDecorationSourceView;

    const collected = collectQuireDecorations(view, state);
    expect(collected).toHaveLength(1);
    expect(collected[0]!.from).toBe(1);
  });

  it("does not call a decorations prop declared for DOM views only", () => {
    const state = EditorState.create({
      doc: schema.node("doc", null, [schema.node("paragraph", null, schema.text("ab"))])
    });
    const build = vi.fn(() => DecorationSet.empty);
    const domOnly = markQuireDomOnlyDecorations(new Plugin({ props: { decorations: build } }));
    const painted = new Plugin({ props: { decorations: () => DecorationSet.create(state.doc, [Decoration.inline(1, 2, { class: "painted" })]) } });
    const view = {
      someProp: (_name: string, callback: (provider: unknown) => unknown) => {
        for (const plugin of [domOnly, painted]) callback(plugin.props.decorations);
      }
    } as unknown as QuireDecorationSourceView;

    expect(collectQuireDecorations(view, state)).toHaveLength(1);
    expect(build).not.toHaveBeenCalled();
  });
});
