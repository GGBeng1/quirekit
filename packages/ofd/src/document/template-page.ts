import { OFDPageContent } from "./page-content";
import type { OFDTemplatePageSnapshot } from "./state";
import type { OFDTemplatePageOptions } from "./types";

/** Reusable fixed-layout page content declared once in document common data. */
export class OFDTemplatePage extends OFDPageContent {
  /** @internal */
  readonly templateIdentity = {};
  /** Zero-based insertion index. */
  readonly index: number;

  /**
   * Creates one internal template page.
   *
   * @param documentIdentity - Identity of the owning document.
   * @param index - Zero-based template insertion index.
   * @param options - Template page dimensions and presentation defaults.
   */
  constructor(
    documentIdentity: object,
    index: number,
    private readonly options: Readonly<OFDTemplatePageOptions>
  ) {
    super(documentIdentity);
    this.index = index;
  }

  /**
   * Freezes template content for deterministic document compilation.
   *
   * @returns Immutable template-page snapshot.
   * @internal
   */
  toSnapshot(): OFDTemplatePageSnapshot {
    return {
      templateIndex: this.index,
      templateIdentity: this.templateIdentity,
      options: this.options,
      layers: this.snapshotLayers()
    };
  }
}
