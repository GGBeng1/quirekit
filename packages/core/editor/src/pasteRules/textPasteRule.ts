import { PasteRule, type PasteRuleFinder } from "../PasteRule";

/** Configuration accepted by {@link textPasteRule}. */
export interface TextPasteRuleConfig {
  /** Finder used to detect pasted text. */
  readonly find: PasteRuleFinder;
  /** Replacement text inserted for the match. */
  readonly replace: string;
}

/**
 * Builds a paste rule that replaces matched text.
 *
 * @param config - Finder and replacement.
 * @returns Paste rule instance.
 */
export function textPasteRule(config: TextPasteRuleConfig): PasteRule {
  return new PasteRule({
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
    }
  });
}
