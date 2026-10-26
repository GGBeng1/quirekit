import type { OmmlElement, OmmlNode } from "../types";
import { OmmlDecodeError } from "./error";

/**
 * Reads the tag of a preserve-order element.
 * @param node - Element or text.
 * @returns Tag, or undefined for text.
 */
export function tagOf(node: OmmlNode): string | undefined {
  return Object.keys(node).find(key => key !== ":@" && key !== "#text");
}

/**
 * Reads the children of an element.
 * @param node - Element.
 * @returns Child nodes.
 */
export function childrenOf(node: OmmlNode): readonly OmmlNode[] {
  const tag = tagOf(node);
  return tag === undefined ? [] : (node as OmmlElement)[tag] as readonly OmmlNode[];
}

/**
 * Lists child elements, skipping Word's routine control properties.
 * @param node - Element.
 * @returns Meaningful child elements.
 */
export function elementsOf(node: OmmlNode): OmmlElement[] {
  return childrenOf(node).filter((child): child is OmmlElement => {
    const tag = tagOf(child);
    return tag !== undefined && tag !== "m:ctrlPr";
  });
}

/**
 * Finds the single child element with a tag.
 * @param node - Parent element.
 * @param tag - Child tag.
 * @returns Child element, or undefined.
 */
export function child(node: OmmlNode, tag: string): OmmlElement | undefined {
  return elementsOf(node).find(item => tagOf(item) === tag);
}

/**
 * Reads a structure's properties as tag → `m:val`, rejecting properties outside the allowed set.
 * @param node - Structure element.
 * @param propertiesTag - Property container tag such as `m:fPr`.
 * @param allowed - Tags this decoder understands.
 * @param label - Structure name used in explanations.
 * @returns Property values; toggles without a value read as `1`.
 */
export function properties(node: OmmlNode, propertiesTag: string, allowed: readonly string[], label: string): Map<string, string> {
  const values = new Map<string, string>();
  const container = child(node, propertiesTag);
  if (container === undefined) return values;
  for (const property of elementsOf(container)) {
    const tag = tagOf(property)!;
    if (!allowed.includes(tag)) throw new OmmlDecodeError(`不支持${label}的“${tag.replace(/^m:/u, "")}”设置`);
    const value = (property[":@"] as Record<string, string> | undefined)?.["@_m:val"];
    values.set(tag, value === undefined || value === "on" || value === "true" ? "1" : value === "off" || value === "false" ? "0" : value);
  }
  return values;
}

/**
 * Lists the structural children of an element other than its property container.
 * @param node - Structure element.
 * @param propertiesTag - Property container tag.
 * @returns Slots in order.
 */
export function slotsOf(node: OmmlNode, propertiesTag: string): OmmlElement[] {
  return elementsOf(node).filter(item => tagOf(item) !== propertiesTag);
}
