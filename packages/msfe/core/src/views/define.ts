import type { MsfeNodeViewDefinition, MsfeNodeViewSpec } from "./types";

/**
 * Keeps codec inputs typed together, erasing only for heterogeneous runtime storage.
 * @param definition - Feature-owned source reader, precise patcher and renderer.
 * @returns Installable codec; the feature must pair its renderer with these same attributes.
 */
export function defineNodeView<Attrs extends object, Resource = unknown>(definition: MsfeNodeViewDefinition<Attrs, Resource>): MsfeNodeViewSpec {
  return definition as unknown as MsfeNodeViewSpec;
}
