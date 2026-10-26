import { expect, it, vi } from "vitest";
import type { QuireEditor } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import { resolveEditorBlockHover } from "./query";
vi.mock("@quirekit/extensions", () => ({ readBlockCatalog: vi.fn() }));

it("chooses the innermost declared block using a single bounded geometry query", () => {
  const doc = {};
  const blocks = [
    { from: 0, to: 100, scopeId: "doc" },
    { from: 2, to: 20, scopeId: "left" },
    { from: 50, to: 70, scopeId: "right" }
  ];
  vi.mocked(readBlockCatalog).mockReturnValue({ doc, byFrom: new Map(blocks.map(block => [block.from, block])) } as never);
  const query = vi.fn(() => blocks.map((block, i) => ({ ...block, sourceDocument: doc,
    rect: { x: i === 2 ? 400 : 100, y: i ? 20 : 0, width: i ? 250 : 600, height: i ? 30 : 100 }
  })));
  const editor = { isEditable: true, view: { queryBlockFragments: query } } as unknown as QuireEditor;
  expect(resolveEditorBlockHover(editor, 200, 35)?.block).toBe(blocks[1]);
  expect(query).toHaveBeenCalledTimes(1);
  expect(resolveEditorBlockHover(editor, 500, 35)?.block).toBe(blocks[2]);
  expect(resolveEditorBlockHover(editor, 90, 90)?.block).toBe(blocks[0]);
  expect(resolveEditorBlockHover(editor, 10, 35)).toBeNull();
});
