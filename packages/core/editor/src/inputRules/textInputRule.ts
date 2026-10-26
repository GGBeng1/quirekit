import { InputRule, type InputRuleFinder } from "../InputRule";

/** Configuration accepted by {@link textInputRule}. */
export interface TextInputRuleConfig {
  /** Finder used to detect typed text. */
  readonly find: InputRuleFinder;
  /** Replacement text inserted for the match. */
  readonly replace: string;
  /** Whether the input rule is undoable. */
  readonly undoable?: boolean;
}

/**
 * Builds an input rule that replaces matched text.
 *
 * @param config - Finder, replacement, and undo behavior.
 * @returns Input rule instance.
 */
export function textInputRule(config: TextInputRuleConfig): InputRule {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      let insert = config.replace;
      let start = range.from;
      const end = range.to;

      if (match[1]) {
        const offset = match[0].lastIndexOf(match[1]);
        insert += match[0].slice(offset + match[1].length);
        start += offset;
      }

      state.tr.insertText(insert, start, end);
    },
    ...(config.undoable === undefined ? {} : { undoable: config.undoable })
  });
}
