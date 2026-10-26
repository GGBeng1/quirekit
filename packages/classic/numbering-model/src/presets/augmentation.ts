import type { QuireExtensionThisContext } from "@quirekit/core";
import type { WordNumberingPresetContribution } from "./types";

/** Extension factory that contributes semantic Word numbering presets. */
type WordNumberingPresetContributionFactory<
  Options extends object,
  Storage extends object
> = (
  this: QuireExtensionThisContext<Options, Storage>,
  context: QuireExtensionThisContext<Options, Storage>
) => readonly WordNumberingPresetContribution[];

declare module "@quirekit/core" {
  /** Word numbering fields available to behavior extensions. */
  interface QuireExtensionConfig<
    Options extends object = object,
    Storage extends object = object
  > {
    /** Creates semantic Word numbering presets owned by this extension. */
    readonly addWordNumberingPresets?: WordNumberingPresetContributionFactory<
      Options,
      Storage
    >;
  }

  /** Word numbering fields available to node extensions. */
  interface QuireNodeConfig<
    Options extends object = object,
    Storage extends object = object
  > {
    /** Creates semantic Word numbering presets owned by this extension. */
    readonly addWordNumberingPresets?: WordNumberingPresetContributionFactory<
      Options,
      Storage
    >;
  }

  /** Word numbering fields available to mark extensions. */
  interface QuireMarkConfig<
    Options extends object = object,
    Storage extends object = object
  > {
    /** Creates semantic Word numbering presets owned by this extension. */
    readonly addWordNumberingPresets?: WordNumberingPresetContributionFactory<
      Options,
      Storage
    >;
  }
}

export {};
