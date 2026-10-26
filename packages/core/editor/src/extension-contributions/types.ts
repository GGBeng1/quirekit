import type { QuireAnyExtension } from "../types";

/** Context supplied to one leaf-package extension contribution factory. */
export interface QuireExtensionContributionFactoryContext {
  /** Name of the extension that owns the contribution factory. */
  readonly name: string;
  /** Resolved extension options. */
  readonly options: Readonly<Record<string, unknown>>;
  /** Mutable runtime storage owned by the extension. */
  readonly storage: Readonly<Record<string, unknown>>;
  /** Complete resolved extension set available for schema-aware contributions. */
  readonly extensions?: readonly QuireAnyExtension[] | undefined;
  /** Parent contribution factory resolved through an `extend()` chain. */
  readonly parent?: ((
    context: QuireExtensionContributionFactoryContext
  ) => readonly unknown[]) | undefined;
}

/** One contribution annotated with its owning resolved extension. */
export interface QuireOwnedExtensionContribution<Contribution> {
  /** Extension that declared the contribution. */
  readonly extension: QuireAnyExtension;
  /** Stable extension name used by diagnostics. */
  readonly extensionName: string;
  /** Leaf-package contribution value returned by the factory. */
  readonly contribution: Contribution;
}
