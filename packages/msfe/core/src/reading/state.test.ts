import { describe, expect, it, vi } from "vitest";
import { ensureSyntaxTree, syntaxTree } from "@quirekit/cm-language";
import { createMsfeReadState } from "./state";
import { Extension } from "../authoring/definition";
import { resolveMarkdownReference } from "../markdown/references/query";

describe("headless reading state", () => {
  it("uses canonical reference grouping without mounting editor lifecycle hooks", () => {
    const mounted = vi.fn();
    let state = createMsfeReadState({ markdown: "[foo][bar][baz]\n\n[baz]: /target\n\n[baz]: /wrong", extensions: [
      Extension.create({ name: "reading-consumer", onCreate: mounted }),
    ] });
    ensureSyntaxTree(state, state.doc.length, 1000); state = state.update({}).state;
    expect(state.readOnly).toBe(true);
    const link = syntaxTree(state).topNode.getChild("Paragraph")!.getChild("Link")!;
    expect(state.sliceDoc(link.from, link.to)).toBe("[bar][baz]");
    expect(resolveMarkdownReference(state, "baz")).toMatchObject({ status: "resolved", definition: { url: "/target" } });
    expect(mounted).not.toHaveBeenCalled();
  });

  it("rejects a second source owner", () => {
    expect(() => createMsfeReadState({ extensions: [{ id: "provider", sourceProvider: {} as never }] }))
      .toThrow("reading-source-provider");
  });
});
