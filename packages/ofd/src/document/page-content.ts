import type {
  OFDDrawImageOptions,
  OFDDrawCompositeOptions,
  OFDDrawPathOptions,
  OFDDrawTextOptions,
  OFDLayerOptions
} from "../model";
import type { OFDCompositeGraphicUnit, OFDImage } from "../resources";
import type { OFDPageImage } from "./page-resources";
import { OFDLayer } from "./layer";
import { OFDPageBlock } from "./page-block";
import type { OFDLayerSnapshot } from "./state";

/** Shared layer and default-body behavior for physical and template pages. */
export abstract class OFDPageContent {
  private readonly layers: OFDLayer[] = [];
  private defaultLayer: OFDLayer | undefined;

  /**
   * Creates page content owned by one document.
   *
   * @param documentIdentity - Identity of the owning document.
   */
  protected constructor(
    readonly documentIdentity: object,
    protected pageResourceIdentity: object | undefined = undefined
  ) {}

  /**
   * Adds an ordered layer to this page content.
   *
   * @param options - Layer role.
   * @returns New page layer.
   */
  addLayer(options: OFDLayerOptions = {}): OFDLayer {
    const layer = new OFDLayer(
      this.documentIdentity,
      this.pageResourceIdentity,
      Object.freeze({ ...options })
    );
    this.layers.push(layer);
    return layer;
  }

  /**
   * Adds a recursively nestable page block on the default body layer.
   *
   * @returns New page block.
   */
  addPageBlock(): OFDPageBlock {
    return this.obtainDefaultLayer().addPageBlock();
  }

  /**
   * Draws text on the lazily-created default body layer.
   *
   * @param text - Authored Unicode text.
   * @param options - Font, boundary, placement, and paint.
   * @returns This page content for fluent authoring.
   */
  drawText(text: string, options: OFDDrawTextOptions): this {
    this.obtainDefaultLayer().drawText(text, options);
    return this;
  }

  /**
   * Draws a path on the lazily-created default body layer.
   *
   * @param options - Boundary, path operations, and paint.
   * @returns This page content for fluent authoring.
   */
  drawPath(options: OFDDrawPathOptions): this {
    this.obtainDefaultLayer().drawPath(options);
    return this;
  }

  /**
   * Draws an image on the lazily-created default body layer.
   *
   * @param image - Image resource owned by the same document.
   * @param options - Boundary, transform, clipping, and border.
   * @returns This page content for fluent authoring.
   */
  drawImage(image: OFDImage | OFDPageImage, options: OFDDrawImageOptions): this {
    this.obtainDefaultLayer().drawImage(image, options);
    return this;
  }

  /**
   * Draws one reusable composite graphic on the lazily-created body layer.
   *
   * @param composite - Same-document composite graphic resource.
   * @param options - Boundary, transform, clipping, and actions.
   * @returns This page content for fluent authoring.
   */
  drawComposite(
    composite: OFDCompositeGraphicUnit,
    options: OFDDrawCompositeOptions
  ): this {
    this.obtainDefaultLayer().drawComposite(composite, options);
    return this;
  }

  /**
   * Freezes ordered layers, retaining an empty default body layer when needed.
   *
   * @returns Immutable ordered layer snapshots.
   */
  protected snapshotLayers(): readonly OFDLayerSnapshot[] {
    if (this.layers.length === 0) this.obtainDefaultLayer();
    return Object.freeze(this.layers.map((layer) => layer.toSnapshot()));
  }

  /**
   * Returns the lazily-created default body layer.
   *
   * @returns Default body layer.
   */
  private obtainDefaultLayer(): OFDLayer {
    if (!this.defaultLayer) {
      this.defaultLayer = this.addLayer({ type: "Body" });
    }
    return this.defaultLayer;
  }
}
