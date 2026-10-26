import type {
  CreateQuireKitIconRegistryOptions,
  QuireKitIconData,
  QuireKitIconRegistry
} from "./types";

/**
 * Creates an immutable named registry over audited icon data.
 *
 * Names are a product-level convenience; callers may still pass icon data
 * directly to the renderer. Unknown names never become an unrelated glyph
 * unless the product explicitly configures a fallback.
 *
 * @param entries - Canonical icon names and trusted glyph data.
 * @param options - Optional aliases and explicit fallback.
 * @returns Immutable icon lookup retaining the entry-name union.
 */
export function createQuireKitIconRegistry<
  const Entries extends Readonly<Record<string, QuireKitIconData>>
>(
  entries: Entries,
  options: CreateQuireKitIconRegistryOptions<keyof Entries & string> = {}
): QuireKitIconRegistry<keyof Entries & string> {
  type Name = keyof Entries & string;
  const names = Object.freeze(Object.keys(entries) as Name[]);
  const canonical = new Map<string, QuireKitIconData>(
    Object.entries(entries) as [string, QuireKitIconData][]
  );
  const aliases = new Map<string, Name>(Object.entries(options.aliases ?? {}));

  for (const [alias, target] of aliases) {
    if (canonical.has(alias)) {
      throw new TypeError(`Icon alias "${alias}" conflicts with a canonical name.`);
    }
    if (!canonical.has(target)) {
      throw new TypeError(`Icon alias "${alias}" targets unknown icon "${target}".`);
    }
  }
  if (options.fallback !== undefined && !canonical.has(options.fallback)) {
    throw new TypeError(`Icon fallback "${options.fallback}" is not registered.`);
  }

  /**
   * Resolves a name without applying fallback.
   *
   * @param name - Candidate canonical or alias name.
   * @returns Canonical icon data, or undefined for an unknown name.
   */
  function resolveKnown(name: string): QuireKitIconData | undefined {
    return canonical.get(name) ?? canonical.get(aliases.get(name) ?? "");
  }

  return Object.freeze({
    names,
    fallback: options.fallback,
    has(name: string): boolean {
      return resolveKnown(name) !== undefined;
    },
    resolve(name: string): QuireKitIconData | undefined {
      return resolveKnown(name)
        ?? (options.fallback === undefined ? undefined : canonical.get(options.fallback));
    }
  });
}
