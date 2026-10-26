import type { Plugin } from "@quirekit/pm";

/** Registered key, so separately bundled copies of this module recognize the mark. */
const domOnlyDecorationsKey = Symbol.for("quirekit.decorations.domOnly");

/**
 * Declares that every decoration a plugin's `decorations` prop returns targets DOM views.
 *
 * Layout-painted views skip such a prop without calling it, so its decorations
 * are only built for DOM views. ProseMirror binds prop functions when the
 * plugin is constructed, so the bound prop is marked.
 *
 * @param plugin - Constructed plugin with a `decorations` prop.
 * @returns The same plugin.
 */
export function markQuireDomOnlyDecorations<P extends Plugin>(plugin: P): P {
  const provider: unknown = plugin.props.decorations;
  if (typeof provider === "function") Object.defineProperty(provider, domOnlyDecorationsKey, { value: true });
  return plugin;
}

/**
 * @param provider - Candidate `decorations` prop as a view resolves it.
 * @returns Whether its plugin declared that it only serves DOM views.
 */
export function isQuireDomOnlyDecorations(provider: unknown): boolean {
  return typeof provider === "function" && (provider as unknown as Record<symbol, unknown>)[domOnlyDecorationsKey] === true;
}
