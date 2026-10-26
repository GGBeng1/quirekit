import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { ClassicToolbarEntryMeta } from "./types";

/**
 * Namespaces individual feature controls while retaining their original contracts.
 * @param featureKey - Stable placement owning the feature lifecycle.
 * @param entries - Current public feature entries.
 * @param parent - Original feature-local ancestry.
 * @returns Public entries routed through shared body renderers and opaque metadata.
 */
export function projectClassicToolbarFeature(
  featureKey: string,
  entries: readonly QuireKitToolbarEntry[],
  parent: readonly string[] = []
): readonly QuireKitToolbarEntry[] {
  return entries.map(original => {
    const path = [...parent, original.value];
    const meta: ClassicToolbarEntryMeta = { kind: "feature", featureKey, original, path };
    return {
      ...original,
      value: `feature:${featureKey}:${path.map(encodeURIComponent).join("/")}`,
      meta,
      ...(original.renderer === undefined ? {} : { renderer: "classic-feature-control" }),
      ...(original.contentRenderer === undefined ? {} : { contentRenderer: "classic-feature-content" }),
      ...(original.children === undefined ? {} : { children: projectClassicToolbarFeature(featureKey, original.children, path) })
    };
  });
}
