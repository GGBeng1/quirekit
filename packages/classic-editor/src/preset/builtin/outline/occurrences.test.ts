import { Extension, QuireEditor, type CommandProps, type QuireEditorTransactionEvent } from "@quirekit/core";
import type { Plugin } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import { createClassicEditorOutlineOccurrences } from "./occurrences";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));

/** @param extensions - Additional lifecycle fixtures. @returns Real PM editor with independently queryable occurrence projection. */
function createFixture(extensions: Extension[] = []) {
  const editor = new QuireEditor({ extensions: [StarterKit, ...extensions], content: {
    type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "prefix" }] },
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "A" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "B" }] }
    ]
  } });
  cleanup.push(() => editor.destroy());
  const registry = createClassicEditorOutlineOccurrences(editor.state.doc);
  const applied = vi.fn((event: QuireEditorTransactionEvent) => registry.applyBatch(event));
  editor.on("transaction", applied);
  const context = { editor, locale: "en" } as ClassicEditorRenderContext;
  return { editor, registry, applied, project: () => registry.project(context, "Untitled") };
}

it("retains identity through internal text edits, shares unaffected children and reclassifies changed levels", () => {
  const fixture = createFixture();
  const before = fixture.project();
  const root = before.nodes[0]!;
  fixture.editor.commands.insertContentAt(before.positions.get(root.id)! + 1, "New ");
  const renamed = fixture.project();
  expect(renamed.nodes[0]?.id).toBe(root.id);
  expect(renamed.nodes[0]?.label).toBe("New A");
  expect(renamed.nodes[0]?.children).toBe(root.children);
  fixture.editor.commands.command(({ tr }: CommandProps) => {
    tr.setNodeAttribute(renamed.positions.get(root.id)!, "level", 3);
    return true;
  });
  const changed = fixture.project();
  expect(changed.nodes.map(node => node.id)).toEqual([root.id, root.children![0]!.id]);
  expect(changed.nodes[1]).toBe(root.children![0]);
});

it("gives two occurrences of the same immutable node independent identities", () => {
  const fixture = createFixture();
  const schema = fixture.editor.state.pm.schema;
  const shared = schema.nodes.heading!.create({ level: 1 }, schema.text("Same"));
  fixture.editor.commands.command(({ tr }: CommandProps) => {
    tr.insert(0, shared).insert(shared.nodeSize, shared);
    return true;
  });
  expect(fixture.editor.state.doc.child(0)).toBe(fixture.editor.state.doc.child(1));
  const tree = fixture.project();
  expect(tree.nodes.slice(0, 2).map(node => node.label)).toEqual(["Same", "Same"]);
  expect(tree.nodes[0]?.id).not.toBe(tree.nodes[1]?.id);
  expect(tree.positions.get(tree.nodes[0]!.id)).toBe(0);
  expect(tree.positions.get(tree.nodes[1]!.id)).toBe(shared.nodeSize);
});

it("does not transfer a deleted heading identity to an identical node reinserted at the same position", () => {
  const fixture = createFixture();
  const before = fixture.project();
  const id = before.nodes[0]!.id;
  const position = before.positions.get(id)!;
  const original = fixture.editor.state.doc.nodeAt(position)!;
  fixture.editor.commands.command(({ tr }: CommandProps) => {
    tr.delete(position, position + original.nodeSize).insert(position, original);
    return true;
  });
  expect(fixture.editor.state.doc.nodeAt(position)).toBe(original);
  const after = fixture.project();
  expect(after.nodes[0]?.label).toBe("A");
  expect(after.nodes[0]?.id).not.toBe(id);
  expect(after.positions.has(id)).toBe(false);
});

it("preserves surviving headings through undo and assigns new ids after whole-document replacement", () => {
  const fixture = createFixture();
  const before = fixture.project();
  fixture.editor.commands.insertContentAt(1, "typing");
  expect(fixture.project().nodes).toBe(before.nodes);
  fixture.editor.commands.undo();
  const undone = fixture.project();
  expect(undone.nodes).toBe(before.nodes);
  expect([...undone.positions]).toEqual([...before.positions]);
  fixture.editor.commands.replaceDocument(fixture.editor.getJSON());
  const replaced = fixture.project();
  expect(replaced.nodes[0]?.id).not.toBe(before.nodes[0]?.id);
  expect(replaced.nodes[0]?.label).toBe(before.nodes[0]?.label);
});

it("allocates fresh identities for deleted headings restored by undo and for split occurrences", () => {
  const fixture = createFixture();
  const before = fixture.project();
  const root = before.nodes[0]!;
  const position = before.positions.get(root.id)!;
  const node = fixture.editor.state.doc.nodeAt(position)!;
  fixture.editor.commands.deleteRange({ from: position, to: position + node.nodeSize });
  expect(fixture.project().positions.has(root.id)).toBe(false);
  fixture.editor.commands.undo();
  const restored = fixture.project();
  expect(restored.nodes[0]?.label).toBe(root.label);
  expect(restored.nodes[0]?.id).not.toBe(root.id);
  const restoredId = restored.nodes[0]!.id;
  fixture.editor.commands.command(({ tr }: CommandProps) => {
    tr.split(restored.positions.get(restoredId)! + 1);
    return true;
  });
  const split = fixture.project();
  expect(split.positions.has(restoredId)).toBe(false);
  expect(new Set(split.positions.keys()).size).toBe(split.positions.size);
});

it("consumes appended transaction mappings before projecting navigation", () => {
  const fixture = createFixture([Extension.create({ name: "appendOutlinePrefix", addProseMirrorPlugins() {
    // This fixture needs PM's append lifecycle, without a DOM plugin surface.
    return [{ key: "outline-prefix-fixture", props: {}, spec: {
      appendTransaction(transactions, _oldState, state) {
        return transactions.some(transaction => transaction.getMeta("outlinePrefix") === true)
          ? state.tr.insertText("y", 1).setMeta("outlineAppended", true) : null;
      }
    } } as Plugin];
  } })]);
  const before = fixture.project();
  fixture.editor.commands.command(({ tr }: CommandProps) => {
    tr.insertText("x", 1).setMeta("outlinePrefix", true);
    return true;
  });
  const appended = fixture.applied.mock.calls[0]![0].appendedTransactions;
  expect(appended.filter(transaction => transaction.getMeta("outlineAppended") === true)).toHaveLength(1);
  const after = fixture.project();
  expect(after.nodes).toBe(before.nodes);
  for (const [id, position] of before.positions) expect(after.positions.get(id)).toBe(position + 2);
});

it.each([false, true])("drops identity when a document transition is missed, with a later batch %s", laterBatch => {
  const fixture = createFixture();
  const before = fixture.project();
  fixture.editor.off("transaction", fixture.applied);
  fixture.editor.commands.insertContentAt(1, "missed");
  if (laterBatch) {
    fixture.editor.on("transaction", fixture.applied);
    fixture.editor.commands.insertContentAt(1, "seen");
  }
  const after = fixture.project();
  expect(after.nodes[0]?.id).not.toBe(before.nodes[0]?.id);
  expect(after.positions.has(before.nodes[0]!.id)).toBe(false);
});
