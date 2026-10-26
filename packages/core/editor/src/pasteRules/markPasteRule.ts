import type { EditorState, MarkType } from "@quirekit/pm";
import type { ExtendedRegExpMatchArray } from "../InputRule";
import { PasteRule, type PasteRuleFinder } from "../PasteRule";
import { callOrReturn } from "../utilities/callOrReturn";

/** Configuration accepted by {@link markPasteRule}. */
export interface MarkPasteRuleConfig {
  /** Finder used to detect pasted text. */
  readonly find: PasteRuleFinder;
  /** Mark type or mark type name to apply to the matched capture. */
  readonly type: MarkType | string;
  /** Static or computed mark attributes. */
  readonly getAttributes?:
    | Record<string, unknown>
    | ((match: ExtendedRegExpMatchArray, event: ClipboardEvent | null) => Record<string, unknown>)
    | false
    | null;
}

/**
 * Builds a paste rule that applies a mark to matched text.
 *
 * @param config - Finder, mark type, and attributes.
 * @returns Paste rule instance.
 */
export function markPasteRule(config: MarkPasteRuleConfig): PasteRule {
  return new PasteRule({
    find: config.find,
    handler: ({ state, range, match, pasteEvent }) => {
      const type = resolveMarkType(state, config.type);
      const attributes = callOrReturn(config.getAttributes ?? {}, undefined, match, pasteEvent);

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
    }
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
