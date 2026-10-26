import type {
  QuireExtensionContributionFactoryContext,
  QuireExtensionThisContext
} from "@quirekit/core";

/** Opaque plugin-owned revision declaration validated by the Revision runtime. */
export type WordRevisionContributionDeclaration = object;

/** Extension hook that contributes plugin-owned Word revision declarations. */
export type WordRevisionContributionFactory<
  Options extends object,
  Storage extends object
> = (
  this: QuireExtensionThisContext<Options, Storage>,
  context: QuireExtensionContributionFactoryContext
) => readonly WordRevisionContributionDeclaration[];
