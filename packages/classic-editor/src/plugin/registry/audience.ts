import type { QuireAnyExtension } from "@quirekit/core";
import type {
  ClassicEditorAudience,
  ClassicEditorPlugin,
  ClassicEditorSurfaceMode
} from "../../types";

/** Declaration carrying the audience inherited from its owning plugin. */
export interface ClassicEditorAudienceDeclaration<Value> {
  /** Original declaration retained for registry presentation. */
  readonly value: Value;
  /** Effective audience after owner inheritance. */
  readonly audience: ClassicEditorAudience;
}

/**
 * Resolves an optional declaration audience to the product-safe default.
 *
 * @param audience - Explicit declaration audience.
 * @returns Explicit audience, or the user audience when omitted.
 */
export function resolveClassicEditorAudience(
  audience: ClassicEditorAudience | undefined
): ClassicEditorAudience {
  if (audience === undefined || audience === "user") return "user";
  if (audience === "developer") return "developer";
  throw new RangeError(`Unknown Classic Editor audience: ${String(audience)}`);
}

/**
 * Resolves and validates the create-time product surface mode.
 *
 * @param surfaceMode - Optional consumer or registry surface mode.
 * @returns Valid explicit surface mode, defaulting to the user product.
 */
export function resolveClassicEditorSurfaceMode(
  surfaceMode: ClassicEditorSurfaceMode | undefined
): ClassicEditorSurfaceMode {
  if (surfaceMode === undefined || surfaceMode === "user") return "user";
  if (surfaceMode === "developer") return "developer";
  throw new RangeError(
    `Unknown Classic Editor surface mode: ${String(surfaceMode)}`
  );
}

/**
 * Resolves a child declaration without allowing a developer plugin to downgrade it.
 *
 * @param ownerAudience - Audience declared by the owning plugin.
 * @param childAudience - Optional audience declared by the child contribution.
 * @returns Effective audience enforced by the registry.
 */
export function resolveClassicEditorChildAudience(
  ownerAudience: ClassicEditorAudience | undefined,
  childAudience: ClassicEditorAudience | undefined
): ClassicEditorAudience {
  const owner = resolveClassicEditorAudience(ownerAudience);
  const child = resolveClassicEditorAudience(childAudience);
  return owner === "developer"
    ? "developer"
    : child;
}

/**
 * Reports whether one audience is registered by a product surface mode.
 *
 * @param audience - Effective declaration audience.
 * @param surfaceMode - Create-time product surface mode.
 * @returns Whether the declaration belongs to the active registry.
 */
export function isClassicEditorAudienceVisible(
  audience: ClassicEditorAudience,
  surfaceMode: ClassicEditorSurfaceMode
): boolean {
  return audience === "user" || surfaceMode === "developer";
}

/**
 * Filters validated plugins without changing deterministic declaration order.
 *
 * @param plugins - Fully validated plugin declarations.
 * @param surfaceMode - Create-time product surface mode.
 * @returns Frozen active plugin list used by lifecycle and service registration.
 */
export function filterClassicEditorPluginsByAudience(
  plugins: readonly ClassicEditorPlugin[],
  surfaceMode: ClassicEditorSurfaceMode
): readonly ClassicEditorPlugin[] {
  return Object.freeze(plugins.filter((plugin) => isClassicEditorAudienceVisible(
    resolveClassicEditorAudience(plugin.audience),
    surfaceMode
  )));
}

/**
 * Collects the editor extensions of the plugins visible on a surface, in installation order.
 *
 * @param plugins - Installed product plugins.
 * @param surfaceMode - Create-time product surface mode.
 * @returns Extensions to install after preset and instance extensions.
 */
export function collectClassicEditorPluginExtensions(
  plugins: readonly ClassicEditorPlugin[],
  surfaceMode: ClassicEditorSurfaceMode
): readonly QuireAnyExtension[] {
  return filterClassicEditorPluginsByAudience(plugins, surfaceMode).flatMap(plugin => plugin.extensions ?? []);
}
