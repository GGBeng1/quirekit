import { Extension, isQuireBlockIdentityInitialization } from "@quirekit/core";
import {
  Plugin,
  PluginKey,
  type Node as PMNode,
  type NodeType,
  type Schema
} from "@quirekit/pm";

/** Options used by the trailing node extension. */
export interface TrailingNodeOptions {
  /** Node type inserted at the end of the document. */
  readonly node?: string | undefined;
  /** Node types after which the trailing node must not be inserted. */
  readonly notAfter?: string | readonly string[] | undefined;
}

/** Extension that keeps a textblock node available at the end of a document. */
export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: "trailingNode",

  /**
   * Creates default trailing-node options.
   *
   * @returns Default trailing-node configuration.
   */
  addOptions() {
    return {
      node: undefined,
      notAfter: []
    };
  },

  /**
   * Creates the trailing-node append transaction plugin.
   *
   * @returns ProseMirror plugin list containing the trailing-node plugin.
   */
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey(this.name);
    const options = this.options;

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (transactions, _oldState, state) => {
          // Allocating interaction IDs during open must not alter the content
          // endpoint of an imported or revision-owned document.
          if (transactions.some(isQuireBlockIdentityInitialization)
            && transactions.every(tr => !tr.docChanged || isQuireBlockIdentityInitialization(tr))) return;
          const shouldInsertNodeAtEnd = pluginKey.getState(state);
          const type = state.schema.nodes[resolveDefaultNodeName(options, state.schema)];

          if (!shouldInsertNodeAtEnd || !type) {
            return;
          }

          return state.tr.insert(state.doc.content.size, type.create());
        },
        state: {
          init: (_config, state) =>
            shouldInsertTrailingNode(state.tr.doc.lastChild, state.schema, options),
          apply: (transaction, value) => {
            if (!transaction.docChanged) {
              return value;
            }

            if (transaction.getMeta("__uniqueIDTransaction")) {
              return value;
            }

            return shouldInsertTrailingNode(
              transaction.doc.lastChild,
              transaction.doc.type.schema,
              options
            );
          }
        }
      })
    ];
  }
});

/**
 * Resolves the node name inserted by the trailing-node plugin.
 *
 * @param options - Trailing node extension options.
 * @param schema - Schema from the active ProseMirror state.
 * @returns Node type name to insert.
 */
function resolveDefaultNodeName(
  options: Readonly<TrailingNodeOptions>,
  schema: Schema
): string {
  return options.node || schema.topNodeType.contentMatch.defaultType?.name || "paragraph";
}

/**
 * Reports whether the document should receive a trailing node.
 *
 * @param lastNode - Current last document child.
 * @param schema - Schema from the active ProseMirror state.
 * @param options - Trailing node extension options.
 * @returns Whether a trailing node should be appended.
 */
function shouldInsertTrailingNode(
  lastNode: PMNode | null | undefined,
  schema: Schema,
  options: Readonly<TrailingNodeOptions>
): boolean {
  const defaultNode = resolveDefaultNodeName(options, schema);
  const disabledNodeNames = [...normalizeNotAfter(options.notAfter), defaultNode];
  const disabledNodes = Object.values(schema.nodes)
    .filter((node) => disabledNodeNames.includes(node.name));

  return !nodeEqualsType({ node: lastNode, types: disabledNodes });
}

/**
 * Reports whether a node type matches one or more target types.
 *
 * @param params - Node and node types to compare.
 * @returns Whether the node matches the target type list.
 */
function nodeEqualsType(params: {
  readonly types: NodeType | readonly NodeType[];
  readonly node: PMNode | null | undefined;
}): boolean {
  const { types, node } = params;

  if (!node) {
    return false;
  }

  return Array.isArray(types)
    ? types.includes(node.type)
    : node.type === types;
}

/**
 * Normalizes the notAfter option into a string list.
 *
 * @param notAfter - Optional node name or names.
 * @returns Node names after which trailing nodes are disabled.
 */
function normalizeNotAfter(
  notAfter: string | readonly string[] | undefined
): readonly string[] {
  if (!notAfter) {
    return [];
  }

  return typeof notAfter === "string" ? [notAfter] : notAfter;
}
