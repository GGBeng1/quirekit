import type { EditorState, MarkType } from "@quirekit/pm";
import {
  InputRule,
  type ExtendedRegExpMatchArray,
  type InputRuleFinder
} from "../InputRule";
import { callOrReturn } from "../utilities/callOrReturn";

/** Configuration accepted by {@link markInputRule}. */
export interface MarkInputRuleConfig {
  /** Finder used to detect typed text. */
  readonly find: InputRuleFinder;
  /** Mark type or mark type name to apply to the matched capture. */
  readonly type: MarkType | string;
  /** Whether the input rule is undoable. */
  readonly undoable?: boolean;
  /** Static or computed mark attributes. */
  readonly getAttributes?:
    | Record<string, unknown>
    | ((match: ExtendedRegExpMatchArray) => Record<string, unknown>)
    | false
    | null;
}

/**
 * Builds an input rule that applies a mark to matched text.
 *
 * @param config - Finder, mark type, attributes, and undo behavior.
 * @returns Input rule instance.
 */
export function markInputRule(config: MarkInputRuleConfig): InputRule {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      const type = resolveMarkType(state, config.type);
      const attributes = callOrReturn(config.getAttributes ?? {}, undefined, match);

      if (!type) {
        return null;
      }

      if (attributes === false || attributes === null) {
        return null;
      }

      const capture = match[match.length - 1];
      if (!capture) {
        return null;
      }

      const fullMatch = match[0];
      const startSpaces = fullMatch.search(/\S/);
      const textStart = range.from + fullMatch.indexOf(capture);
      const textEnd = textStart + capture.length;

      if (textEnd < range.to) {
        state.tr.delete(textEnd, range.to);
      }

      if (textStart > range.from) {
        state.tr.delete(range.from + startSpaces, textStart);
      }

      const markEnd = range.from + startSpaces + capture.length;
      state.tr
        .addMark(range.from + startSpaces, markEnd, type.create(attributes || {}))
        .removeStoredMark(type);

      return undefined;
    },
    ...(config.undoable === undefined ? {} : { undoable: config.undoable })
  });
}

/**
 * Resolves a mark type from a concrete type or schema name.
 *
 * @param state - Editor state whose schema owns named mark types.
 * @param type - Mark type or mark type name.
 * @returns Matching mark type, or undefined when the name is unavailable.
 */
function resolveMarkType(
  state: EditorState,
  type: MarkType | string
): MarkType | undefined {
  return typeof type === "string" ? state.schema.marks[type] : type;
}
