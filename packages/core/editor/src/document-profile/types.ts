/**
 * Document-profile registration owned by an extension.
 *
 * A profile supplies document-model semantics (for example Word paragraph
 * formatting or page sections) to a layout engine through named facets. Core
 * treats the payload as opaque; the consuming engine validates its shape.
 */
export interface QuireDocumentProfileRegistration<Profile = unknown> {
  /** Stable profile identifier used for diagnostics and lookup. */
  readonly id: string;
  /** Facet names this profile supplies; each facet may have only one owner. */
  readonly facets: readonly string[];
  /** Opaque profile payload consumed by the layout engine. */
  readonly profile: Profile;
}

/** Registration annotated with the extension that contributed it. */
export interface QuireDocumentProfileEntry<Profile = unknown>
  extends QuireDocumentProfileRegistration<Profile> {
  /** Extension name that contributed the registration. */
  readonly extensionName: string;
}

/** A duplicate profile id gap in a document-profile registry. */
export interface QuireDuplicateDocumentProfileIdGap<Profile = unknown> {
  /** Machine-readable gap code. */
  readonly code: "duplicate-document-profile-id";
  /** Profile id shared by multiple registrations. */
  readonly id: string;
  /** Registrations that share the profile id. */
  readonly entries: readonly QuireDocumentProfileEntry<Profile>[];
}

/** A facet claimed by more than one document profile. */
export interface QuireAmbiguousDocumentProfileFacetGap<Profile = unknown> {
  /** Machine-readable gap code. */
  readonly code: "ambiguous-document-profile-facet";
  /** Facet claimed by multiple profiles. */
  readonly facet: string;
  /** Registrations that claim the facet. */
  readonly entries: readonly QuireDocumentProfileEntry<Profile>[];
}

/** Structural gap produced while building a document-profile registry. */
export type QuireDocumentProfileRegistrationGap<Profile = unknown> =
  | QuireDuplicateDocumentProfileIdGap<Profile>
  | QuireAmbiguousDocumentProfileFacetGap<Profile>;

/** Deterministic lookup table for valid document-profile registrations. */
export interface QuireDocumentProfileRegistry<Profile = unknown> {
  /** Valid entries in extension and declaration order. */
  readonly entries: readonly QuireDocumentProfileEntry<Profile>[];
  /**
   * Looks up the unique profile that supplies a facet.
   *
   * @param facet - Facet name.
   * @returns Owning profile entry, or undefined when no profile supplies it.
   */
  readonly getByFacet: (
    facet: string
  ) => QuireDocumentProfileEntry<Profile> | undefined;
}

/** Result of validating a document-profile registry. */
export type QuireDocumentProfileRegistryResult<Profile = unknown> =
  | {
      /** Indicates that deterministic lookup is available. */
      readonly valid: true;
      /** Validated registry. */
      readonly registry: QuireDocumentProfileRegistry<Profile>;
    }
  | {
      /** Indicates that lookup must not be used. */
      readonly valid: false;
      /** Gaps that made lookup invalid. */
      readonly gaps: readonly QuireDocumentProfileRegistrationGap<Profile>[];
    };
