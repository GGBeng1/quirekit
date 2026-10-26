import type {
  Mark,
  MarkType,
  Node as PMNode,
  NodeType,
  SelectionRange
} from "@quirekit/pm";
import {
  getMarkType,
  getNodeType,
  getSchemaTypeNameByName
} from "../helpers";
import { resolveSchemaTypeName } from "./mark-utils";
import type { QuireAttributeTypeInput } from "./mark-types";
import type { Command } from "../types";

/**
 * Updates attributes of selected nodes or marks.
 *
 * @param typeOrName - Node or mark type object, or schema type name.
 * @param attributes - Attributes to merge into matching nodes or marks.
 * @returns Command that updates matching attributes.
 */
export function updateAttributes(
  typeOrName: QuireAttributeTypeInput,
  attributes: Readonly<Record<string, unknown>> = {}
): Command {
  return ({ state, tr, dispatch }) => {
    const schemaType = getSchemaTypeNameByName(resolveSchemaTypeName(typeOrName), state.schema);

    if (!schemaType) {
      return false;
    }

    const nodeType = schemaType === "node"
      ? getNodeType(typeOrName as string | NodeType, state.schema)
      : null;
    const markType = schemaType === "mark"
      ? getMarkType(typeOrName as string | MarkType, state.schema)
      : null;
    let canUpdate = false;

    for (const range of tr.selection.ranges) {
      canUpdate = updateAttributesInRange({
        range,
        empty: tr.selection.empty,
        doc: state.doc,
        nodeType,
        markType,
        attributes,
        tr,
        canUpdate,
        shouldDispatch: Boolean(dispatch)
      });
    }

    if (canUpdate) {
      dispatch?.(tr.scrollIntoView());
    }

    return canUpdate;
  };
}

/** Inputs for one selection range attribute update pass. */
interface UpdateAttributesInRangeOptions {
  /** Selection range to update. */
  readonly range: SelectionRange;
  /** Whether the overall selection is empty. */
  readonly empty: boolean;
  /** Document to scan. */
  readonly doc: PMNode;
  /** Matching node type, if updating nodes. */
  readonly nodeType: NodeType | null;
  /** Matching mark type, if updating marks. */
  readonly markType: MarkType | null;
  /** Attributes to merge. */
  readonly attributes: Readonly<Record<string, unknown>>;
  /** Mutable transaction receiving updates. */
  readonly tr: Parameters<Command>[0]["tr"];
  /** Existing update status. */
  readonly canUpdate: boolean;
  /** Whether mutation side effects should be written. */
  readonly shouldDispatch: boolean;
}

/**
 * Updates matching nodes or marks in one selection range.
 *
 * @param options - Range update options.
 * @returns Whether this pass found anything to update.
 */
function updateAttributesInRange(options: UpdateAttributesInRangeOptions): boolean {
  const {
    range,
    empty,
    doc,
    nodeType,
    markType,
    attributes,
    tr,
    shouldDispatch
  } = options;
  const from = range.$from.pos;
  const to = range.$to.pos;
  let canUpdate = options.canUpdate;
  let lastPos: number | undefined;
  let lastNode: PMNode | undefined;
  let trimmedFrom = from;
  let trimmedTo = to;

  doc.nodesBetween(from, to, (node: PMNode, pos: number) => {
    if (empty && nodeType && nodeType === node.type) {
      canUpdate = true;
      trimmedFrom = Math.max(pos, from);
      trimmedTo = Math.min(pos + node.nodeSize, to);
      lastPos = pos;
      lastNode = node;

      return;
    }

    if (!empty && pos < from && nodeType && nodeType === node.type) {
      canUpdate = true;
      trimmedFrom = Math.max(pos, from);
      trimmedTo = Math.min(pos + node.nodeSize, to);
      lastPos = pos;
      lastNode = node;

      return;
    }

    if (pos >= from && pos <= to) {
      canUpdate = updateCurrentNodeOrMark({
        node,
        pos,
        from,
        to,
        nodeType,
        markType,
        attributes,
        tr,
        canUpdate,
        shouldDispatch
      });
    }
  });

  return updateLastNodeOrMark({
    lastNode,
    lastPos,
    trimmedFrom,
    trimmedTo,
    markType,
    attributes,
    tr,
    canUpdate,
    shouldDispatch
  });
}

/** Inputs for updating the current scanned node or mark. */
interface UpdateCurrentNodeOrMarkOptions {
  /** Current node. */
  readonly node: PMNode;
  /** Current document position. */
  readonly pos: number;
  /** Range start. */
  readonly from: number;
  /** Range end. */
  readonly to: number;
  /** Matching node type, if updating nodes. */
  readonly nodeType: NodeType | null;
  /** Matching mark type, if updating marks. */
  readonly markType: MarkType | null;
  /** Attributes to merge. */
  readonly attributes: Readonly<Record<string, unknown>>;
  /** Mutable transaction receiving updates. */
  readonly tr: Parameters<Command>[0]["tr"];
  /** Existing update status. */
  readonly canUpdate: boolean;
  /** Whether mutation side effects should be written. */
  readonly shouldDispatch: boolean;
}

/**
 * Applies update logic to the current scanned node and its marks.
 *
 * @param options - Current node update options.
 * @returns Whether anything has been updated or can be updated.
 */
function updateCurrentNodeOrMark(options: UpdateCurrentNodeOrMarkOptions): boolean {
  const {
    node,
    pos,
    from,
    to,
    nodeType,
    markType,
    attributes,
    tr,
    shouldDispatch
  } = options;
  let canUpdate = options.canUpdate;

  if (nodeType && nodeType === node.type) {
    canUpdate = true;

    if (shouldDispatch) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attributes });
    }
  }

  if (markType && node.marks.length > 0) {
    for (const mark of node.marks) {
      if (markType === mark.type) {
        canUpdate = true;

        if (shouldDispatch) {
          tr.addMark(
            Math.max(pos, from),
            Math.min(pos + node.nodeSize, to),
            markType.create({ ...mark.attrs, ...attributes })
          );
        }
      }
    }
  }

  return canUpdate;
}

/** Inputs for updating the saved previous node or mark. */
interface UpdateLastNodeOrMarkOptions {
  /** Last matching node, if any. */
  readonly lastNode: PMNode | undefined;
  /** Last matching node document position. */
  readonly lastPos: number | undefined;
  /** Trimmed range start for the last node. */
  readonly trimmedFrom: number;
  /** Trimmed range end for the last node. */
  readonly trimmedTo: number;
  /** Matching mark type, if updating marks. */
  readonly markType: MarkType | null;
  /** Attributes to merge. */
  readonly attributes: Readonly<Record<string, unknown>>;
  /** Mutable transaction receiving updates. */
  readonly tr: Parameters<Command>[0]["tr"];
  /** Existing update status. */
  readonly canUpdate: boolean;
  /** Whether mutation side effects should be written. */
  readonly shouldDispatch: boolean;
}

/**
 * Applies Tiptap's saved previous-node update behavior.
 *
 * @param options - Last node update options.
 * @returns Whether anything has been updated or can be updated.
 */
function updateLastNodeOrMark(options: UpdateLastNodeOrMarkOptions): boolean {
  const {
    lastNode,
    lastPos,
    trimmedFrom,
    trimmedTo,
    markType,
    attributes,
    tr,
    shouldDispatch
  } = options;
  let canUpdate = options.canUpdate;

  if (!lastNode) {
    return canUpdate;
  }

  if (lastPos !== undefined && shouldDispatch) {
    tr.setNodeMarkup(lastPos, undefined, { ...lastNode.attrs, ...attributes });
  }

  if (markType && lastNode.marks.length > 0) {
    for (const mark of lastNode.marks) {
      if (markType === mark.type) {
        canUpdate = true;
        updateLastMark(mark, markType, trimmedFrom, trimmedTo, attributes, tr, shouldDispatch);
      }
    }
  }

  return canUpdate;
}

/**
 * Updates a mark on the saved previous node.
 *
 * @param mark - Existing mark.
 * @param markType - Matching mark type.
 * @param from - Trimmed range start.
 * @param to - Trimmed range end.
 * @param attributes - Attributes to merge.
 * @param tr - Mutable transaction receiving updates.
 * @param shouldDispatch - Whether mutation side effects should be written.
 */
function updateLastMark(
  mark: Mark,
  markType: MarkType,
  from: number,
  to: number,
  attributes: Readonly<Record<string, unknown>>,
  tr: Parameters<Command>[0]["tr"],
  shouldDispatch: boolean
): void {
  if (!shouldDispatch) {
    return;
  }

  tr.addMark(from, to, markType.create({ ...mark.attrs, ...attributes }));
}
