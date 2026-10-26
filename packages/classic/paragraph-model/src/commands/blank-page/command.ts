import type { CommandSpec, CommandProps } from "@quirekit/core";
import { Fragment, TextSelection } from "@quirekit/pm";
import {
  createBlankPageBlocks,
  createEmptyPageBoundary,
  resolveBodyParagraphType
} from "./blocks";
import {
  findAllowedTextblockDepth,
  isMainStoryBlockParent,
  preserveSplittableMarks
} from "./selection";

/**
 * Creates the main-story Blank page authoring command.
 *
 * @param paragraphNodeNames - Textblock node names that own Word paragraph attrs.
 * @returns Command that inserts one empty page between two page boundaries.
 */
export function createInsertWordBlankPageCommand(
  paragraphNodeNames: readonly string[]
): CommandSpec {
  const allowedNodeNames = new Set(paragraphNodeNames);
  return () => (context) => insertWordBlankPage(context, allowedNodeNames);
}

/**
 * Replaces the active main-story textblock with a bounded empty paragraph.
 *
 * @param context - Active editor command context.
 * @param allowedNodeNames - Configured paragraph-like textblock names.
 * @returns Whether one Blank page transaction was dispatched.
 */
function insertWordBlankPage(
  context: CommandProps,
  allowedNodeNames: ReadonlySet<string>
): boolean {
  const { tr } = context;
  if (!(tr.selection instanceof TextSelection)) return false;

  // Selection deletion and both page boundaries share one history item so undo
  // cannot expose a partially inserted physical page.
  if (!tr.selection.empty) tr.deleteSelection();
  const $head = tr.selection.$head;
  const depth = findAllowedTextblockDepth($head, allowedNodeNames);
  if (depth === null || !isMainStoryBlockParent($head.node(depth - 1))) {
    return false;
  }
  const source = $head.node(depth);
  const sourcePosition = $head.before(depth);
  const offset = $head.pos - $head.start(depth);
  const bodyType = resolveBodyParagraphType(
    tr.doc.type.schema.nodes,
    allowedNodeNames,
    source.type
  );
  const blank = createEmptyPageBoundary(bodyType, source);
  if (!blank) return false;
  const replacement = createBlankPageBlocks(source, offset, blank, bodyType);
  if (!replacement) return false;

  tr.replaceWith(
    sourcePosition,
    sourcePosition + source.nodeSize,
    Fragment.fromArray(replacement.blocks)
  );
  const rightStart = sourcePosition
    + replacement.blocks
      .slice(0, replacement.rightIndex)
      .reduce((size, node) => size + node.nodeSize, 0)
    + 1;
  tr.setSelection(TextSelection.create(tr.doc, rightStart));
  preserveSplittableMarks(context, $head.marks());
  context.dispatch?.(tr.scrollIntoView());
  return true;
}
