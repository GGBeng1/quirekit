import {
  Fragment,
  NodeSelection,
  type Node as PMNode,
  type ParseOptions
} from "@quirekit/pm";
import { selectionToInsertionEnd } from "../helpers";
import { createNodeFromContent } from "../helpers/createNodeFromContent";
import type { CommandSpec } from "../types";
import { resolvePosition } from "./position";

/** Options accepted by Tiptap-compatible insertContentAt commands. */
export interface InsertContentAtOptions {
  /** Optional parser options forwarded to createNodeFromContent. */
  parseOptions?: ParseOptions | undefined;
  /** Whether the command should move selection to the inserted content end. */
  updateSelection?: boolean | undefined;
  /** Whether input rules should run for inserted text. */
  applyInputRules?: boolean | undefined;
  /** Whether paste rules should run for inserted text. */
  applyPasteRules?: boolean | undefined;
  /** Whether invalid content should make the command fail. */
  errorOnInvalidContent?: boolean | undefined;
}

/** QuireKit insertion options with renderer-neutral atomic-selection controls. */
export interface QuireInsertContentAtOptions extends InsertContentAtOptions {
  /** Whether one inserted node should receive an atomic NodeSelection. */
  readonly selectInsertedNode?: boolean | undefined;
  /** Whether unsupported content should be ignored instead of rejected. */
  readonly allowUnsupported?: boolean | undefined;
}

/**
 * Inserts content at a document position or range.
 *
 * @param context - Current command execution context.
 * @param position - Position or range where content should be inserted.
 * @param content - Text, ProseMirror node, or fragment to insert.
 * @param options - Optional insertion options.
 * @returns Whether insertion succeeded.
 */
export const insertContentAt: CommandSpec = (position, content, options) => (context) => {
  let range = resolvePosition(position, context.tr.selection.from);

  if (
    content !== null &&
    !Array.isArray(content) &&
    typeof content !== "string" &&
    typeof content !== "object" &&
    !isProseMirrorNode(content) &&
    !(content instanceof Fragment)
  ) {
    if (options && typeof options === "object" && "allowUnsupported" in options) {
      return false;
    }

    return false;
  }

  const commandOptions =
    options && typeof options === "object"
      ? options as QuireInsertContentAtOptions
      : {};
  let parsedContent: PMNode | Fragment;

  try {
    parsedContent = typeof content === "string" && !content.includes("<")
      ? Fragment.from(context.state.schema.text(content))
      : createNodeFromContent(
          content as never,
          context.state.schema,
          {
            slice: true,
            ...(commandOptions.parseOptions === undefined
              ? {}
              : { parseOptions: commandOptions.parseOptions }),
            errorOnInvalidContent: commandOptions.errorOnInvalidContent ?? false
          }
        );
  } catch {
    return false;
  }
  const nodes = parsedContent instanceof Fragment
    ? [...iterateFragment(parsedContent)]
    : [parsedContent];
  let isOnlyTextContent = true;
  let isOnlyBlockContent = true;

  for (const node of nodes) {
    node.check();
    isOnlyTextContent = isOnlyTextContent && node.isText && node.marks.length === 0;
    isOnlyBlockContent = isOnlyBlockContent && node.isBlock;
  }

  if (range.from === range.to && isOnlyBlockContent) {
    const $insert = context.tr.doc.resolve(range.from);
    const { parent } = $insert;
    const isEmptyTextBlock =
      parent.isTextblock &&
      !parent.type.spec.code &&
      !parent.childCount;

    if (isEmptyTextBlock) {
      range = {
        from: range.from - 1,
        to: range.to + 1
      };
    } else if (
      parent.isTextblock &&
      !parent.type.spec.code &&
      parent.childCount &&
      $insert.parentOffset === parent.content.size &&
      $insert.depth > 0
    ) {
      const after = $insert.after();

      range = { from: after, to: after };
    }
  }

  if (isOnlyTextContent) {
    const text = nodes.map((node) => node.text ?? "").join("");

    context.dispatch?.(
      context.tr.insertText(text, range.from, range.to).scrollIntoView()
    );
    return true;
  }

  const $from = context.tr.doc.resolve(range.from);
  const fromSelectionAtStart = $from.parentOffset === 0;
  const selectionNode = $from.node();
  const isTextSelectionNode = selectionNode.isText || selectionNode.isTextblock;
  const hasContent = selectionNode.content.size > 0;
  const insertionStart =
    fromSelectionAtStart
      && isTextSelectionNode
      && hasContent
      && isOnlyBlockContent
      ? Math.max(0, range.from - 1)
      : range.from;
  const startStepCount = context.tr.steps.length;

  context.tr.replaceWith(insertionStart, range.to, parsedContent);

  const updateSelection =
    "updateSelection" in commandOptions
      ? Boolean(commandOptions.updateSelection)
      : true;

  if (commandOptions.selectInsertedNode) {
    const insertedNodePosition = resolveInsertedNodeSelectionPosition(
      context.tr.doc,
      nodes,
      insertionStart
    );
    context.tr.setSelection(NodeSelection.create(
      context.tr.doc,
      insertedNodePosition
    ));
  } else if (updateSelection) {
    selectionToInsertionEnd(context.tr, startStepCount, -1);
  }

  if (commandOptions.applyInputRules) {
    context.tr.setMeta("applyInputRules", { from: insertionStart, text: parsedContent });
  }

  if (commandOptions.applyPasteRules) {
    context.tr.setMeta("applyPasteRules", { from: insertionStart, text: parsedContent });
  }

  context.dispatch?.(context.tr.scrollIntoView());
  return true;
};

/**
 * Resolves one inserted node after ProseMirror applies required schema wrappers.
 *
 * Replacing a selected text block with an inline atom can materialize a new
 * paragraph around that atom. The original replacement start then identifies
 * the wrapper, so selecting it would violate the caller's atomic-node intent.
 *
 * @param document - Post-replacement document.
 * @param insertedNodes - Canonical nodes supplied to the replacement.
 * @param insertionStart - Pre-wrapper replacement start.
 * @returns Exact inserted-node position, or the original start as fallback.
 */
function resolveInsertedNodeSelectionPosition(
  document: PMNode,
  insertedNodes: readonly PMNode[],
  insertionStart: number
): number {
  const target = insertedNodes.length === 1 ? insertedNodes[0] : undefined;
  if (target === undefined || target.isText) return insertionStart;
  const direct = document.nodeAt(insertionStart);
  if (direct?.eq(target)) return insertionStart;
  const searchEnd = Math.min(
    document.content.size,
    insertionStart + target.nodeSize + 2
  );
  let match: number | undefined;
  document.nodesBetween(insertionStart, searchEnd, (node, position) => {
    if (match === undefined && node.eq(target)) {
      match = position;
      return false;
    }
    return match === undefined;
  });
  return match ?? insertionStart;
}

/**
 * Checks whether a value looks like a ProseMirror node.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a ProseMirror node.
 */
function isProseMirrorNode(value: unknown): value is PMNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "object" &&
    value.type !== null &&
    "schema" in value.type
  );
}

/**
 * Iterates over child nodes in a ProseMirror fragment.
 *
 * @param fragment - Fragment to inspect.
 * @returns Child nodes contained by the fragment.
 */
function iterateFragment(fragment: Fragment): readonly PMNode[] {
  const nodes: PMNode[] = [];

  fragment.forEach((node) => {
    nodes.push(node);
  });

  return nodes;
}
