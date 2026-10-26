import type {
  EditorState as PMEditorState,
  Node as PMNode,
  NodeType,
  Transaction
} from "@quirekit/pm";
import { canJoin, findWrapping } from "@quirekit/pm";
import {
  InputRule,
  type ExtendedRegExpMatchArray,
  type InputRuleFinder
} from "../InputRule";
import type { QuireEditor } from "../Editor";
import type { ChainedCommands } from "../types";
import { callOrReturn } from "../utilities/callOrReturn";

/** Configuration accepted by {@link wrappingInputRule}. */
export interface WrappingInputRuleConfig {
  /** Finder used to detect typed text at the start of a textblock. */
  readonly find: InputRuleFinder;
  /** Node type or node type name used to wrap the active block range. */
  readonly type: NodeType | string;
  /** Whether the input rule should preserve marks after wrapping. */
  readonly keepMarks?: boolean;
  /** Whether the input rule should preserve attributes after wrapping. */
  readonly keepAttributes?: boolean;
  /** Optional editor used by compatibility options such as `keepMarks`. */
  readonly editor?: QuireEditor | undefined;
  /** Whether the input rule is undoable. */
  readonly undoable?: boolean;
  /** Static or computed wrapper attributes. */
  readonly getAttributes?:
    | Record<string, unknown>
    | ((match: ExtendedRegExpMatchArray) => Record<string, unknown>)
    | false
    | null;
  /** Predicate that decides whether adjacent wrappers should be joined. */
  readonly joinPredicate?: (
    match: ExtendedRegExpMatchArray,
    node: PMNode
  ) => boolean;
}

/**
 * Builds an input rule that wraps the current block range in a node.
 *
 * @param config - Finder, wrapper type, attributes, and join behavior.
 * @returns Input rule instance.
 */
export function wrappingInputRule(config: WrappingInputRuleConfig): InputRule {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match, chain }) => {
      const type = resolveWrappingType(state, config.type);
      const attributes = callOrReturn(config.getAttributes ?? {}, undefined, match);

      if (!type) {
        return null;
      }

      if (attributes === false || attributes === null) {
        return null;
      }

      const tr = state.tr.delete(range.from, range.to);
      const $start = tr.doc.resolve(range.from);
      const blockRange = $start.blockRange();
      const wrapping = blockRange && findWrapping(blockRange, type, attributes || {});

      if (!wrapping) {
        return null;
      }

      tr.wrap(blockRange, wrapping);
      preserveMarksWhenRequested(config, state);
      preserveAttributesWhenRequested(config, chain, type, attributes || {});
      joinPreviousWrapperWhenAllowed(config, tr, type, range.from, match);

      return undefined;
    },
    ...(config.undoable === undefined ? {} : { undoable: config.undoable })
  });
}

/**
 * Resolves a wrapping node type from a concrete type or schema name.
 *
 * @param state - Editor state whose schema owns named node types.
 * @param type - Node type or node type name.
 * @returns Matching node type, or undefined when the name is unavailable.
 */
function resolveWrappingType(
  state: PMEditorState,
  type: NodeType | string
): NodeType | undefined {
  return typeof type === "string" ? state.schema.nodes[type] : type;
}

/**
 * Preserves stored marks for the next input when requested.
 *
 * @param config - Wrapping rule configuration.
 * @param state - ProseMirror state that owns stored marks.
 */
function preserveMarksWhenRequested(
  config: WrappingInputRuleConfig,
  state: PMEditorState
): void {
  if (!config.keepMarks) {
    return;
  }

  const { selection, storedMarks } = state;
  const marks = storedMarks ?? (selection.$to.parentOffset ? selection.$from.marks() : null);

  if (marks) {
    state.tr.ensureMarks(marks);
  }
}

/**
 * Preserves wrapper attributes through the command chain when requested.
 *
 * @param config - Wrapping rule configuration.
 * @param chain - Command chain factory exposed to input rule handlers.
 * @param attributes - Attributes resolved from the rule match.
 */
function preserveAttributesWhenRequested(
  config: WrappingInputRuleConfig,
  chain: () => ChainedCommands,
  type: NodeType,
  attributes: Record<string, unknown>
): void {
  if (!config.keepAttributes) {
    return;
  }

  const nodeTypeName =
    type.name === "bulletList" || type.name === "orderedList"
      ? "listItem"
      : "taskList";
  const commandChain = chain() as ChainedCommands & {
    updateAttributes?: (
      name: string,
      attrs: Record<string, unknown>
    ) => { run: () => boolean };
  };

  commandChain.updateAttributes?.(nodeTypeName, attributes).run();
}

/**
 * Joins the created wrapper with a compatible previous sibling when allowed.
 *
 * @param config - Wrapping rule configuration.
 * @param tr - Transaction that owns the wrapped range.
 * @param from - Original match start position.
 * @param match - Input rule match.
 */
function joinPreviousWrapperWhenAllowed(
  config: WrappingInputRuleConfig,
  tr: Transaction,
  type: NodeType,
  from: number,
  match: ExtendedRegExpMatchArray
): void {
  const before = tr.doc.resolve(from - 1).nodeBefore;

  if (
    before &&
    before.type === type &&
    canJoin(tr.doc, from - 1) &&
    (!config.joinPredicate || config.joinPredicate(match, before))
  ) {
    tr.join(from - 1);
  }
}
