import type {
  QuireMediaAssetKind,
  QuireMediaAssetRegistrar,
  QuireMediaAssetResolver,
  QuireMediaAssetSink
} from "@quirekit/media";

/** Media authorities shared by one Classic Editor instance and its mounted views. */
export interface ClassicEditorMediaServices {
  /** Registration boundary used by authoring actions before document insertion. */
  readonly sink: QuireMediaAssetSink;
  /** Lease-based registration boundary for fallible authoring workflows. */
  readonly registrar?: QuireMediaAssetRegistrar | undefined;
  /** Resolution boundary injected into every mounted rendering backend. */
  readonly resolver: QuireMediaAssetResolver;
  /**
   * Allocates one stable host-scoped media identity.
   *
   * @param kind - Media family receiving the identity.
   * @returns A non-empty identity that is unique within the backing repository.
   */
  createAssetId(kind: QuireMediaAssetKind): string;
}
