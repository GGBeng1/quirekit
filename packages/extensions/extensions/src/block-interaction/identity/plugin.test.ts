import { createEditor, Node } from "@quirekit/core";
import { afterEach, expect, it, vi } from "vitest";
import { BlockInteraction } from "../extension";
import { readBlockCatalog } from "./plugin";

const Doc = Node.create({ name: "doc", topNode: true, content: "block+" });
const Paragraph = Node.create({ name: "paragraph", group: "block", content: "inline*" });
const Text = Node.create({ name: "text", group: "inline" });
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

afterEach(() => vi.unstubAllGlobals());

it("initializes independent roots and preserves existing block IDs without native randomUUID", () => {
  vi.stubGlobal("crypto", { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) });
  const editor = createEditor({ extensions: [Doc, Paragraph, Text, BlockInteraction], content: {
    type: "doc", content: [
      { type: "paragraph", attrs: { blockId: "persisted-block" }, content: [{ type: "text", text: "Original" }] },
      { type: "paragraph", content: [{ type: "text", text: "New" }] }
    ]
  } });
  try {
    const catalog = readBlockCatalog(editor)!;
    expect(catalog.rootId).toMatch(uuidV4);
    expect(editor.state.doc.child(0).attrs.blockId).toBe("persisted-block");
    expect(editor.state.doc.child(1).attrs.blockId).toMatch(uuidV4);
    expect(editor.state.doc.child(1).attrs.blockId).not.toBe(catalog.rootId);
    const reopened = createEditor({ extensions: [Doc, Paragraph, Text, BlockInteraction], content: editor.getJSON() });
    try {
      expect(reopened.getJSON()).toEqual(editor.getJSON());
      expect(readBlockCatalog(reopened)!.rootId).not.toBe(catalog.rootId);
    } finally { reopened.destroy(); }
  } finally { editor.destroy(); }
});
