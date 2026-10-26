import {
  DecorationSet,
  type Decoration as PMDecoration,
  type Mapping,
  type Node as PMNode
} from "@quirekit/pm";
import type { Decoration, WidgetDecoration } from "./decoration";

/** Result of lowering declarative decorations into one ProseMirror set. */
export interface LoweredDecorationSet {
  /** ProseMirror decoration set. */
  readonly set: DecorationSet;
  /** Stable identities of widgets present in the set. */
  readonly widgetKeys: Set<string>;
}

/**
 * Lowers declarative decorations and records their widget identities.
 *
 * @param doc - Document the decorations belong to.
 * @param decorations - Declarative decorations to lower.
 * @param extensionName - Producing extension name.
 * @returns ProseMirror set and live widget identities.
 */
export function createDecorationSet(
  doc: PMNode,
  decorations: readonly Decoration[],
  extensionName: string
): LoweredDecorationSet {
  const widgetKeys = new Set<string>();
  const lowered = decorations.map((decoration) => {
    if (isWidgetDecoration(decoration)) {
      widgetKeys.add(decoration.key);
    }

    return decoration.toPMDecoration(extensionName);
  });

  return { set: DecorationSet.create(doc, lowered), widgetKeys };
}

/**
 * Narrows one declarative decoration to its widget family.
 *
 * @param decoration - Decoration to inspect.
 * @returns Whether the decoration is a widget.
 */
function isWidgetDecoration(
  decoration: Decoration
): decoration is WidgetDecoration {
  return decoration.kind === "widget";
}

/**
 * Maps one extension's decoration set through a transaction mapping.
 *
 * @param set - Decoration set before the transaction.
 * @param mapping - Transaction position mapping.
 * @param doc - Document after the transaction.
 * @param widgetKeys - Mutable live widget identities to prune on removal.
 * @returns Mapped decoration set.
 */
export function mapDecorationSet(
  set: DecorationSet,
  mapping: Mapping,
  doc: PMNode,
  widgetKeys: Set<string>
): DecorationSet {
  return set.map(mapping, doc, {
    onRemove(spec: { readonly key?: unknown } | undefined) {
      if (typeof spec?.key === "string") {
        widgetKeys.delete(spec.key);
      }
    }
  });
}

/**
 * Merges independently-owned decoration sets for one document.
 *
 * @param doc - Document shared by every set.
 * @param sets - Decoration sets keyed by extension name.
 * @returns Merged decoration set.
 */
export function mergeDecorationSets(
  doc: PMNode,
  sets: Readonly<Record<string, DecorationSet>>
): DecorationSet {
  return DecorationSet.create(
    doc,
    Object.values(sets).flatMap((set) => set.find())
  );
}

/**
 * Reads a stable widget identity from a ProseMirror decoration.
 *
 * @param decoration - Decoration to inspect.
 * @returns Stable widget key, when present.
 */
export function readWidgetKey(decoration: PMDecoration): string | undefined {
  const key = (decoration.spec as { readonly key?: unknown } | undefined)?.key;

  return typeof key === "string" ? key : undefined;
}

/**
 * Unions widget identities owned by multiple extensions.
 *
 * @param keysByExtension - Widget identities keyed by extension name.
 * @returns Union of every live widget key.
 */
export function mergeWidgetKeys(
  keysByExtension: Readonly<Record<string, Set<string>>>
): Set<string> {
  const result = new Set<string>();

  for (const keys of Object.values(keysByExtension)) {
    for (const key of keys) {
      result.add(key);
    }
  }

  return result;
}
