import type { Mark, Node } from "@quirekit/pm";
import type { QuireExtensionAttribute } from "../types";
import { mergeAttributes } from "../utilities/mergeAttributes";

/**
 * Gets HTML attributes that should be rendered for a node or mark.
 *
 * @param nodeOrMark - ProseMirror node or mark being rendered.
 * @param extensionAttributes - Resolved extension attributes.
 * @returns Merged rendered attributes.
 */
export function getRenderedAttributes(
  nodeOrMark: Node | Mark,
  extensionAttributes: readonly QuireExtensionAttribute[]
): Record<string, unknown> {
  return extensionAttributes
    .filter((item) => item.type === nodeOrMark.type.name)
    .filter((item) => item.attribute.rendered)
    .map((item) => {
      if (!item.attribute.renderHTML) {
        return { [item.name]: nodeOrMark.attrs[item.name] };
      }

      return item.attribute.renderHTML(nodeOrMark.attrs) ?? {};
    })
    .reduce<Record<string, unknown>>(
      (attributes, item) => mergeAttributes(attributes, item),
      {}
    );
}
