import type { OFDCompositeGraphicUnitOptions } from "../resources";
import type { OFDCompositeGraphicUnitSnapshot } from "./state";
import { OFDPageContent } from "./page-content";

/** Reusable document-owned vector graphic resource with layered content. */
export class OFDCompositeGraphicUnit extends OFDPageContent {
  /** @internal */
  readonly resourceIndex: number;
  /** Frozen composite dimensions and optional thumbnail handle. */
  readonly options: Readonly<OFDCompositeGraphicUnitOptions>;

  /**
   * Creates an internal reusable composite graphic resource.
   *
   * @param documentIdentity - Identity of the owning document.
   * @param resourceIndex - Stable composite registration index.
   * @param options - Frozen resource options.
   */
  constructor(
    documentIdentity: object,
    resourceIndex: number,
    options: Readonly<OFDCompositeGraphicUnitOptions>
  ) {
    super(documentIdentity);
    this.resourceIndex = resourceIndex;
    this.options = options;
  }

  /**
   * Freezes composite layers for deterministic resource compilation.
   *
   * @returns Immutable composite resource snapshot.
   * @internal
   */
  toSnapshot(): OFDCompositeGraphicUnitSnapshot {
    return {
      source: this,
      options: this.options,
      layers: this.snapshotLayers()
    };
  }
}
