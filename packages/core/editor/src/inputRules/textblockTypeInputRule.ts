import type { EditorState, NodeType } from "@quirekit/pm";
import {
  InputRule,
  type ExtendedRegExpMatchArray,
  type InputRuleFinder
} from "../InputRule";
import { callOrReturn } from "../utilities/callOrReturn";

/** Configuration accepted by {@link textblockTypeInputRule}. */
export interface TextblockTypeInputRuleConfig {
  /** Finder used to detect typed text at the start of a textblock. */
  readonly find: InputRuleFinder;
  /** Textblock node type or node type name to set when the rule matches. */
  readonly type: NodeType | string;
  /** Whether the input rule is undoable. */
  readonly undoable?: boolean;
  /** Static or computed node attributes. */
  readonly getAttributes?:
    | Record<string, unknown>
    | ((match: ExtendedRegExpMatchArray) => Record<string, unknown>)
    | false
    | null;
}

/**
 * Builds an input rule that changes the current textblock type.
 *
 * @param config - Finder, textblock type, attributes, and undo behavior.
 * @returns Input rule instance.
 */
export function textblockTypeInputRule(
  config: TextblockTypeInputRuleConfig
): InputRule {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      const $start = state.doc.resolve(range.from);
      const type = resolveTextblockType(state, config.type);
      const attributes = callOrReturn(config.getAttributes ?? {}, undefined, match);

      if (!type) {
        return null;
      }

      if (attributes === false || attributes === null) {
        return null;
      }

      if (
        !$start
          .node(-1)
          .canReplaceWith($start.index(-1), $start.indexAfter(-1), type)
      ) {
        return null;
      }

      state.tr
        .delete(range.from, range.to)
        .setBlockType(range.from, range.from, type, attributes || {});

      return undefined;
    },
    ...(config.undoable === undefined ? {} : { undoable: config.undoable })
  });
}

/**
 * Resolves a textblock node type from a concrete type or schema name.
 *
 * @param state - Editor state whose schema owns named node types.
 * @param type - Node type or node type name.
 * @returns Matching node type, or undefined when the name is unavailable.
 */
function resolveTextblockType(
  state: EditorState,
  type: NodeType | string
): NodeType | undefined {
  return typeof type === "string" ? state.schema.nodes[type] : type;
}
