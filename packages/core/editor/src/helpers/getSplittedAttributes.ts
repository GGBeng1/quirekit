import type { QuireExtensionAttribute } from "../types";

/**
 * Gets attributes that should be preserved when a node is split.
 *
 * @param extensionAttributes - Resolved extension attributes.
 * @param typeName - Node or mark type name.
 * @param attributes - Current attrs object.
 * @returns Attributes whose metadata allows keeping them on split.
 */
export function getSplittedAttributes(
  extensionAttributes: readonly QuireExtensionAttribute[],
  typeName: string,
  attributes: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(attributes).flatMap(([name, value]) => {
      const extensionAttribute = extensionAttributes.find((item) =>
        item.type === typeName && item.name === name
      );

      if (!extensionAttribute?.attribute.keepOnSplit) return [];
      const project = extensionAttribute.attribute.splitValue;
      return [[name, project == null ? value : project(value)]];
    })
  );
}
