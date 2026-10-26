import type { WordRevisionContributionFactory } from "./types";

declare module "@quirekit/core" {
  /** Word revision contribution seam available to behavior extensions. */
  interface QuireExtensionConfig<
    Options extends object = object,
    Storage extends object = object
  > {
    /** Creates opaque declarations validated by the installed Revision runtime. */
    readonly addWordRevisions?: WordRevisionContributionFactory<Options, Storage>;
  }

  /** Word revision contribution seam available to node extensions. */
  interface QuireNodeConfig<
    Options extends object = object,
    Storage extends object = object
  > {
    /** Creates opaque declarations validated by the installed Revision runtime. */
    readonly addWordRevisions?: WordRevisionContributionFactory<Options, Storage>;
  }

  /** Word revision contribution seam available to mark extensions. */
  interface QuireMarkConfig<
    Options extends object = object,
    Storage extends object = object
  > {
    /** Creates opaque declarations validated by the installed Revision runtime. */
    readonly addWordRevisions?: WordRevisionContributionFactory<Options, Storage>;
  }
}

export {};
