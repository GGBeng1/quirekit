import type { ExtensionDefinition, ExtensionSetup, MsfeExtension } from "./types";

/**
 * Creates immutable author configuration; mutable storage is allocated only per editor.
 * @param definition - Defaults and pure contribution factory.
 * @returns Configurable descriptor accepted wherever a low-level extension is accepted.
 */
export function defineExtension<Options extends object>(definition: ExtensionSetup<Options>): ExtensionDefinition<Options> {
  /** @param options - Owned shallow option copy. @param overrides - Explicit contribution overrides. @returns Descriptor. */
  function build(options: Options, overrides: Partial<MsfeExtension>): ExtensionDefinition<Options> {
    const frozen = Object.freeze({ ...options });
    const contributions = { ...definition.setup(frozen), id: definition.id, ...overrides };
    return Object.freeze({ ...contributions, options: frozen,
      configure(patch: Partial<Options>) { return build({ ...frozen, ...patch }, overrides); },
      extend(patch: Partial<MsfeExtension>) { return build(frozen, { ...overrides, ...patch }); },
    });
  }
  return build(definition.options, {});
}
