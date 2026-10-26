import type { QuireLayoutDependency } from "../layout-dependency/types";

/** Capability classes that a layout provider may own. */
export type QuireLayoutProviderCapabilityKind =
  | "child-flow"
  | "fragmentation"
  | "selection-domain"
  | "semantic-export";

/** Renderer-neutral provider registration owned by an extension. */
export interface QuireLayoutProviderRegistration<Provider = unknown> {
  /** Stable provider identifier used for diagnostics and lookup. */
  readonly id: string;
  /** ProseMirror node type names handled by the provider. */
  readonly nodeTypes: readonly string[];
  /** Capability classes implemented by the provider. */
  readonly capabilities: readonly QuireLayoutProviderCapabilityKind[];
  /** Opaque provider payload consumed by a capability-owned integration. */
  readonly provider: Provider;
  /** Optional proof covering this concrete provider and all mutable dependencies. */
  readonly layoutDependency?: QuireLayoutDependency | undefined;
}

/** Registration annotated with the extension that contributed it. */
export interface QuireLayoutProviderEntry<Provider = unknown>
  extends QuireLayoutProviderRegistration<Provider> {
  /** Extension name that contributed the registration. */
  readonly extensionName: string;
}

/** A duplicate provider id gap in a layout-provider registry. */
export interface QuireDuplicateLayoutProviderIdGap<Provider = unknown> {
  /** Machine-readable gap code. */
  readonly code: "duplicate-layout-provider-id";
  /** Provider id shared by multiple registrations. */
  readonly id: string;
  /** Registrations that share the provider id. */
  readonly entries: readonly QuireLayoutProviderEntry<Provider>[];
}

/** An ambiguous node ownership gap in a layout-provider registry. */
export interface QuireAmbiguousNodeLayoutProviderGap<Provider = unknown> {
  /** Machine-readable gap code. */
  readonly code: "ambiguous-node-layout-provider";
  /** Node type claimed by multiple providers. */
  readonly nodeType: string;
  /** Registrations that claim the node type. */
  readonly entries: readonly QuireLayoutProviderEntry<Provider>[];
}

/** Structural gap produced while building a layout-provider registry. */
export type QuireLayoutProviderRegistrationGap<Provider = unknown> =
  | QuireDuplicateLayoutProviderIdGap<Provider>
  | QuireAmbiguousNodeLayoutProviderGap<Provider>;

/** Deterministic lookup table for valid layout-provider registrations. */
export interface QuireLayoutProviderRegistry<Provider = unknown> {
  /** Valid entries in extension and declaration order. */
  readonly entries: readonly QuireLayoutProviderEntry<Provider>[];
  /**
   * Looks up a provider by its stable id.
   *
   * @param id - Stable provider identifier.
   * @returns Matching provider entry, or undefined when no entry exists.
   */
  readonly getById: (
    id: string
  ) => QuireLayoutProviderEntry<Provider> | undefined;
  /**
   * Looks up the unique provider for a node type.
   *
   * @param nodeType - ProseMirror node type name.
   * @returns Matching provider entry, or undefined when no entry exists.
   */
  readonly getByNodeType: (
    nodeType: string
  ) => QuireLayoutProviderEntry<Provider> | undefined;
}

/** Result of validating a layout-provider registry. */
export type QuireLayoutProviderRegistryResult<Provider = unknown> =
  | {
      /** Indicates that deterministic lookup is available. */
      readonly valid: true;
      /** Validated registry. */
      readonly registry: QuireLayoutProviderRegistry<Provider>;
    }
  | {
      /** Indicates that lookup must not be used. */
      readonly valid: false;
      /** Gaps that made lookup invalid. */
      readonly gaps: readonly QuireLayoutProviderRegistrationGap<Provider>[];
    };
