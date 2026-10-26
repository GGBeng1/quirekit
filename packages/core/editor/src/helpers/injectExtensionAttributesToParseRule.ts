import type { ParseRule, TagParseRule } from "@quirekit/pm";
import type { QuireExtensionAttribute } from "../types";
import { fromString } from "../utilities/fromString";

/**
 * Injects extension attribute parsing into a ProseMirror parse rule.
 *
 * Style parse rules are returned unchanged because ProseMirror style rules use
 * a different `getAttrs` contract.
 *
 * @param parseRule - Parse rule to wrap.
 * @param extensionAttributes - Attributes to parse from matched elements.
 * @returns Parse rule with merged attribute parsing.
 */
export function injectExtensionAttributesToParseRule(
  parseRule: ParseRule,
  extensionAttributes: readonly QuireExtensionAttribute[]
): ParseRule {
  if ("style" in parseRule) {
    return parseRule;
  }

  const tagParseRule = parseRule as TagParseRule;

  return {
    ...tagParseRule,
    getAttrs: (node: HTMLElement) => {
      const oldAttributes = tagParseRule.getAttrs
        ? tagParseRule.getAttrs(node)
        : tagParseRule.attrs;

      if (oldAttributes === false) {
        return false;
      }

      const newAttributes = extensionAttributes.reduce<Record<string, unknown>>(
        (items, item) => {
          const value = item.attribute.parseHTML
            ? item.attribute.parseHTML(node)
            : fromString(node.getAttribute(item.name));

          if (value === null || value === undefined) {
            return items;
          }

          return {
            ...items,
            [item.name]: value
          };
        },
        {}
      );

      return { ...(oldAttributes ?? {}), ...newAttributes };
    }
  } as ParseRule;
}
