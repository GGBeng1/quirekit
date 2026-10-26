import type { Transaction } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import { activityKinds } from "@quirekit/edit-history";
import { readChangeOrigin, sourceOperation } from "@quirekit/msfe-core";
import type { MdActivityChange } from "./types";

const localOrigins = new Set(["command", "agent", "history"]);
const blockTypes: Readonly<Record<string, string>> = { Table: "table", FencedCode: "code", Blockquote: "quote", BulletList: "list", OrderedList: "ordered",
  HorizontalRule: "divider", DisplayMath: "math", DefinitionList: "definition", FootnoteDefinition: "footnote" };

/**
 * Recognizes what a local transaction did. Remote, external and selection-only transactions are not local edits.
 * @param transaction - Accepted transaction.
 * @returns The change, or null when nothing should be recorded.
 */
export function classifyTransaction(transaction: Transaction): MdActivityChange | null {
  if (!transaction.docChanged) return null;
  const origin = readChangeOrigin(transaction);
  // Local input, commands, AI writes and local history are recorded; other labelled origins belong to peers or the host.
  if (origin !== undefined && !localOrigins.has(origin)) return null;
  const source = origin === "agent" ? "ai" as const : "human" as const;
  const operation = transaction.annotation(sourceOperation);
  if (operation) return { kind: operation.kind, facts: operation.facts ?? {}, source, mergeable: false };
  if (transaction.isUserEvent("redo")) return { kind: activityKinds.redo, facts: {}, source, mergeable: false };
  if (origin === "history" || transaction.isUserEvent("undo")) return { kind: activityKinds.undo, facts: {}, source, mergeable: false };
  if (transaction.isUserEvent("input.paste")) return { kind: activityKinds.textPaste, facts: insertedBlocks(transaction), source, mergeable: false };
  if (transaction.isUserEvent("input.drop")) return { kind: activityKinds.textDrop, facts: insertedBlocks(transaction), source, mergeable: false };
  if (transaction.isUserEvent("delete.cut")) return { kind: activityKinds.textCut, facts: {}, source, mergeable: false };
  if (transaction.isUserEvent("input") || transaction.isUserEvent("delete")) return { kind: activityKinds.textEdit, facts: {}, source, mergeable: true };
  // Commands without a label: a change that creates whole blocks reads as an insertion.
  const facts = insertedBlocks(transaction);
  return facts.types ? { kind: activityKinds.blockInsert, facts: { type: (facts.types as string[])[0] }, source, mergeable: false }
    : { kind: activityKinds.textEdit, facts: {}, source, mergeable: true };
}

/**
 * @param transaction - Accepted transaction.
 * @returns Block types entirely inside inserted text, read from the accepted parse; empty when none.
 */
export function insertedBlocks(transaction: Transaction): Readonly<Record<string, unknown>> {
  const types: string[] = [];
  const tree = syntaxTree(transaction.state), state = transaction.state;
  transaction.changes.iterChangedRanges((_fromA, _toA, from, to) => {
    if (to - from < 3) return;
    tree.iterate({ from, to, enter(node) {
      if (node.from < from || node.to > to) return;
      let type = blockTypes[node.name];
      if (node.name === "CustomContainer") {
        const name = node.node.getChild("ContainerName");
        type = name ? state.sliceDoc(name.from, name.to) : "container";
      }
      if (type) { types.push(type); return false; }
    } });
  });
  return types.length ? { types: [...new Set(types)] } : {};
}
