import { createEditor } from "@quirekit/core";
import { expect, it } from "vitest";
import { BlockInteraction } from "../extension";
import { readBlockCatalog } from "../identity";
import { resolveBlockRange } from "./catalog";

it("reuses scope membership across selection frames without enumerating the document again", () => {
  const editor = createEditor({ extensions: [BlockInteraction], content: { type: "doc", content:
    Array.from({ length: 500 }, (_, index) => ({ type: "paragraph", content: [{ type: "text", text: String(index) }] }))
  } });
  const source = readBlockCatalog(editor)!;
  let walks = 0;
  const catalog = { ...source, blocks: new Proxy(source.blocks, {
    /** @param target - Retained facts. @param key - Requested member. @param receiver - Proxy receiver. @returns Original member while counting full iteration. */
    get(target, key, receiver) {
      if (key === Symbol.iterator) walks++;
      return Reflect.get(target, key, receiver);
    }
  }) };
  for (let index = 0; index < 100; index++) {
    const anchor = source.blocks[250]!, focus = source.blocks[251 + index]!;
    expect(resolveBlockRange(catalog, { anchor, focus, expectedDocumentRevision: catalog.revision }))
      .toEqual(source.blocks.slice(250, 252 + index));
  }
  expect(walks).toBe(1);
  editor.destroy();
});
