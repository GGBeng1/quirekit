import { mindMapStyleKeys, type MindMapFormatting } from "@quirekit/mind-map";
import type { SimpleInstance } from "../../vendor/types";
import { fromSimpleStyle, simpleStyleKeys } from "../../codec/formatting";

/** @param instance - Owned current selection. @returns Only selected explicit properties; null records disagreement. */
export function mindMapSelectionFormatting(instance: SimpleInstance): MindMapFormatting {
  const styles = instance.renderer.activeNodeList.map(node => fromSimpleStyle(Object.fromEntries(simpleStyleKeys
    .map(key => [key, node.getData(key)]).filter(([, value]) => value !== undefined))) ?? {});
  if (!styles.length) return Object.freeze({});
  return Object.freeze(Object.fromEntries(mindMapStyleKeys.flatMap(key => {
    const first = styles[0]![key];
    const value = styles.every(style => style[key] === first) ? first : null;
    return value === undefined ? [] : [[key, value]];
  })));
}
