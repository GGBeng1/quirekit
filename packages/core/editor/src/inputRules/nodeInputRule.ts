import type { EditorState, NodeType } from "@quirekit/pm";
import {
  InputRule,
  type ExtendedRegExpMatchArray,
  type InputRuleFinder
} from "../InputRule";
import { callOrReturn } from "../utilities/callOrReturn";

/** Configuration accepted by {@link nodeInputRule}. */
export interface NodeInputRuleConfig {
  /** Finder used to detect typed text. */
  readonly find: InputRuleFinder;
  /** Node type or node type name to insert when the rule matches. */
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
 * Builds an input rule that replaces matched text with a node.
 *
 * @param config - Finder, node type, attributes, and undo behavior.
 * @returns Input rule instance.
 */
export function nodeInputRule(config: NodeInputRuleConfig): InputRule {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      const type = resolveNodeType(state, config.type);
      const attributes = callOrReturn(config.getAttributes ?? {}, undefined, match);

      if (!type) {
        return null;
      }

      if (attributes === false || attributes === null) {
        return null;
      }

      const node = type.create(attributes || {});
      const capture = match[1];
      let end = range.to;

      if (capture) {
        const offset = match[0].lastIndexOf(capture);
        let matchStart = range.from + offset;

        if (matchStart > end) {
          matchStart = end;
        } else {
          end = matchStart + capture.length;
        }

        state.tr.insertText(match[0].slice(-1), range.from + match[0].length - 1);
        state.tr.replaceWith(matchStart, end, node);

        return undefined;
      }

      if (match[0]) {
        const insertionStart = type.isInline ? range.from : range.from - 1;

        state.tr
          .insert(insertionStart, node)
          .delete(state.tr.mapping.map(range.from), state.tr.mapping.map(end));
      }

      state.tr.scrollIntoView();

      return undefined;
    },
    ...(config.undoable === undefined ? {} : { undoable: config.undoable })
  });
}

/**
 * Resolves a node type from a concrete type or schema name.
 *
 * @param state - Editor state whose schema owns named node types.
 * @param type - Node type or node type name.
 * @returns Matching node type, or undefined when the name is unavailable.
 */
function resolveNodeType(
  state: EditorState,
  type: NodeType | string
): NodeType | undefined {
  return typeof type === "string" ? state.schema.nodes[type] : type;
}
