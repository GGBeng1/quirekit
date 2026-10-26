import type { NodeType } from "@quirekit/pm";
import type { ExtendedRegExpMatchArray } from "../InputRule";
import { PasteRule, type PasteRuleFinder } from "../PasteRule";
import type { QuireJSONContent } from "../types";
import { callOrReturn } from "../utilities/callOrReturn";

/** Configuration accepted by {@link nodePasteRule}. */
export interface NodePasteRuleConfig {
  /** Finder used to detect pasted text. */
  readonly find: PasteRuleFinder;
  /** Node type to insert when the rule matches. */
  readonly type: NodeType;
  /** Static or computed node attributes. */
  readonly getAttributes?:
    | Record<string, unknown>
    | ((
        match: ExtendedRegExpMatchArray,
        event: ClipboardEvent | null
      ) => Record<string, unknown>)
    | false
    | null;
  /** Optional node content produced from resolved attributes. */
  readonly getContent?:
    | readonly QuireJSONContent[]
    | ((attrs: Record<string, unknown>) => readonly QuireJSONContent[])
    | false
    | null;
}

/**
 * Builds a paste rule that replaces matched pasted text with a node.
 *
 * @param config - Finder, node type, attributes, and optional node content.
 * @returns Paste rule instance.
 */
export function nodePasteRule(config: NodePasteRuleConfig): PasteRule {
  return new PasteRule({
    find: config.find,
    handler: ({ state, range, match, pasteEvent }) => {
      const attributes = callOrReturn(
        config.getAttributes ?? {},
        undefined,
        match,
        pasteEvent
      );

      if (attributes === false || attributes === null) {
        return null;
      }

      const content = callOrReturn(
        config.getContent ?? null,
        undefined,
        attributes
      );
      const node = config.type.schema.nodeFromJSON({
        type: config.type.name,
        attrs: attributes || {},
        ...(content ? { content } : {})
      });

      state.tr.replaceWith(range.from, range.to, node).scrollIntoView();

      return undefined;
    }
  });
}
