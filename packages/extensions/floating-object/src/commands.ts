import { canInsertNode, isNodeSelection } from "@quirekit/core";
import type { AnyCommands, CommandProps, CommandSpec } from "@quirekit/core";
import { NodeSelection, TextSelection } from "@quirekit/pm";
import {
  moveFloatingObjectGeometry,
  readFloatingObjectGeometry,
  resizeFloatingObjectGeometry
} from "./geometry";
import type {
  FloatingObjectAttributes,
  FloatingObjectMove,
  FloatingObjectOptions,
  FloatingObjectResize,
  FloatingObjectRestore
} from "./types";

/**
 * Creates the command surface for one floating-object extension instance.
 *
 * @param nodeName - Registered floating-object node type name.
 * @param options - Geometry defaults and lower bounds.
 * @returns Command map contributed to the editor.
 */
export function createFloatingObjectCommands(
  nodeName: string,
  options: FloatingObjectOptions
): AnyCommands {
  return {
    setFloatingObject: createSetFloatingObjectCommand(nodeName, options),
    selectFloatingObject: createSelectFloatingObjectCommand(nodeName),
    enterFloatingObject: createEnterFloatingObjectCommand(nodeName),
    leaveFloatingObject: createSelectFloatingObjectCommand(nodeName),
    moveFloatingObject: createMoveFloatingObjectCommand(nodeName),
    resizeFloatingObject: createResizeFloatingObjectCommand(nodeName, options),
    restoreFloatingObjectGeometry:
      createRestoreFloatingObjectGeometryCommand(nodeName)
  };
}

/**
 * Creates an exact-position geometry restore command for cancelled gestures.
 *
 * @param nodeName - Registered node type name.
 * @returns Command restoring captured geometry and object selection.
 */
function createRestoreFloatingObjectGeometryCommand(
  nodeName: string
): CommandSpec {
  return (value: FloatingObjectRestore) => ({ dispatch, tr }: CommandProps) => {
    const node = tr.doc.nodeAt(value.position);
    if (
      node?.type.name !== nodeName
      || readFloatingObjectGeometry(node.attrs) === undefined
      || readFloatingObjectGeometry({
        width: value.geometry.width,
        minHeight: value.geometry.minHeight,
        inlineOffset: value.geometry.inlineOffset,
        blockOffset: value.geometry.blockOffset
      }) === undefined
    ) {
      return false;
    }
    tr.setNodeMarkup(value.position, undefined, value.geometry);
    tr.setSelection(NodeSelection.create(tr.doc, value.position));
    dispatch?.(tr);
    return true;
  };
}

/**
 * Creates an insertion command with canonical default geometry.
 *
 * @param nodeName - Registered node type name.
 * @param options - Geometry defaults.
 * @returns Floating-object insertion command.
 */
function createSetFloatingObjectCommand(
  nodeName: string,
  options: FloatingObjectOptions
): CommandSpec {
  return (attributes: Partial<FloatingObjectAttributes> = {}) => (
    { dispatch, state, tr }: CommandProps
  ) => {
    const nodeType = state.schema.nodes[nodeName];
    if (!nodeType || !canInsertNode(state, nodeType)) {
      return false;
    }
    const geometry = readFloatingObjectGeometry({
      width: attributes.width ?? options.width,
      minHeight: attributes.minHeight ?? options.minHeight,
      inlineOffset: attributes.inlineOffset ?? 0,
      blockOffset: attributes.blockOffset ?? 0
    });
    const node = geometry === undefined ? undefined : nodeType.createAndFill(geometry);
    if (!node) {
      return false;
    }
    if (dispatch) {
      tr.replaceSelectionWith(node).setSelection(
        TextSelection.near(tr.doc.resolve(tr.selection.from + 1), 1)
      );
    }
    return true;
  };
}

/**
 * Creates an object-selection command.
 *
 * @param nodeName - Registered node type name.
 * @returns Command selecting the nearest floating object.
 */
function createSelectFloatingObjectCommand(nodeName: string): CommandSpec {
  return () => ({ dispatch, state, tr }: CommandProps) => {
    const position = findFloatingObjectPosition(state.selection, nodeName);
    if (position === undefined) {
      return false;
    }
    if (dispatch) {
      tr.setSelection(NodeSelection.create(tr.doc, position));
    }
    return true;
  };
}

/**
 * Creates a command that enters the nearest nested text root.
 *
 * @param nodeName - Registered node type name.
 * @returns Command placing a text selection inside the object.
 */
function createEnterFloatingObjectCommand(nodeName: string): CommandSpec {
  return () => ({ dispatch, state, tr }: CommandProps) => {
    const position = findFloatingObjectPosition(state.selection, nodeName);
    if (position === undefined) {
      return false;
    }
    if (dispatch) {
      tr.setSelection(TextSelection.near(tr.doc.resolve(position + 1), 1));
    }
    return true;
  };
}

/**
 * Creates a transaction-owned movement command.
 *
 * @param nodeName - Registered node type name.
 * @returns Command applying one move delta.
 */
function createMoveFloatingObjectCommand(nodeName: string): CommandSpec {
  return (move: FloatingObjectMove) => (
    props: CommandProps
  ) => updateFloatingObjectGeometry(props, nodeName, (geometry) =>
    moveFloatingObjectGeometry(geometry, move));
}

/**
 * Creates a transaction-owned resize command.
 *
 * @param nodeName - Registered node type name.
 * @param options - Geometry lower bounds.
 * @returns Command applying one resize delta.
 */
function createResizeFloatingObjectCommand(
  nodeName: string,
  options: FloatingObjectOptions
): CommandSpec {
  return (resize: FloatingObjectResize) => (
    props: CommandProps
  ) => updateFloatingObjectGeometry(props, nodeName, (geometry) =>
    resizeFloatingObjectGeometry(geometry, resize, options));
}

/**
 * Updates the nearest floating-object node through one transaction.
 *
 * @param props - Current command context.
 * @param nodeName - Registered node type name.
 * @param update - Pure geometry transformation.
 * @returns Whether valid geometry was found and accepted.
 */
function updateFloatingObjectGeometry(
  { dispatch, state, tr }: CommandProps,
  nodeName: string,
  update: (
    geometry: FloatingObjectAttributes
  ) => FloatingObjectAttributes | undefined
): boolean {
  const position = findFloatingObjectPosition(state.selection, nodeName);
  const node = position === undefined ? undefined : state.doc.nodeAt(position);
  const geometry = node == null
    ? undefined
    : readFloatingObjectGeometry(node.attrs);
  const next = geometry === undefined ? undefined : update(geometry);
  if (position === undefined || node == null || next === undefined) {
    return false;
  }
  if (dispatch) {
    // Replacing node markup remaps an exact NodeSelection into nested text.
    // Restore only the object-owned selection; text editing must remain text-owned.
    const preserveObjectSelection = isNodeSelection(state.selection)
      && state.selection.from === position
      && state.selection.node.type.name === nodeName;
    tr.setNodeMarkup(position, undefined, next);
    if (preserveObjectSelection) {
      tr.setSelection(NodeSelection.create(tr.doc, position));
    }
  }
  return true;
}

/**
 * Resolves the nearest floating-object position without inventing ancestry.
 *
 * @param selection - Current document selection.
 * @param nodeName - Registered node type name.
 * @returns Position before the object, when the selection belongs to one.
 */
function findFloatingObjectPosition(
  selection: CommandProps["state"]["selection"],
  nodeName: string
): number | undefined {
  if (isNodeSelection(selection) && selection.node.type.name === nodeName) {
    return selection.from;
  }
  for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
    if (selection.$from.node(depth).type.name === nodeName) {
      return selection.$from.before(depth);
    }
  }
  return undefined;
}
