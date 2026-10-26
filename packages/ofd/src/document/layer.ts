import type {
  OFDDrawImageOptions,
  OFDDrawCompositeOptions,
  OFDDrawPathOptions,
  OFDDrawTextOptions,
  OFDGraphicObjectState,
  OFDLayerOptions
} from "../model/types";
import type { OFDCompositeGraphicUnit, OFDImage } from "../resources";
import { OFDPageImage } from "./page-resources";
import { resolveOFDDrawTextOptions } from "../text";
import { OFDPageBlock } from "./page-block";
import type {
  OFDLayerSnapshot,
  OFDPageBlockChildSnapshot
} from "./state";

/** Ordered fixed-layout graphic layer in one OFD page. */
export class OFDLayer {
  private readonly objects: (OFDGraphicObjectState | OFDPageBlock)[] = [];

  /**
   * Creates one internal layer.
   *
   * @param documentIdentity - Owning document identity.
   * @param options - Frozen layer options.
   */
  constructor(
    private readonly documentIdentity: object,
    private readonly pageIdentity: object | undefined,
    private readonly options: Readonly<OFDLayerOptions>
  ) {}

  /**
   * Adds a recursively nestable page block after existing layer children.
   *
   * @returns New page block owned by this layer's document.
   */
  addPageBlock(): OFDPageBlock {
    const block = new OFDPageBlock(this.documentIdentity, this.pageIdentity);
    this.objects.push(block);
    return block;
  }

  /**
   * Draws explicit positioned text.
   *
   * @param text - Authored Unicode text.
   * @param options - Font, boundary, placement, and paint.
   * @returns This layer for fluent authoring.
   */
  drawText(text: string, options: OFDDrawTextOptions): this {
    assertResourceOwner(this.documentIdentity, options.font.documentIdentity);
    this.objects.push({
      type: "text",
      text,
      options: resolveOFDDrawTextOptions(text, options)
    });
    return this;
  }

  /**
   * Draws one typed path.
   *
   * @param options - Boundary, path operations, and paint.
   * @returns This layer for fluent authoring.
   */
  drawPath(options: OFDDrawPathOptions): this {
    this.objects.push({ type: "path", options: freezeValue(options) });
    return this;
  }

  /**
   * Draws one embedded image.
   *
   * @param image - Image resource owned by the same document.
   * @param options - Boundary, transform, clipping, and border.
   * @returns This layer for fluent authoring.
   */
  drawImage(image: OFDImage | OFDPageImage, options: OFDDrawImageOptions): this {
    assertResourceOwner(this.documentIdentity, image.documentIdentity);
    if (image instanceof OFDPageImage && image.pageIdentity !== this.pageIdentity) {
      throw new TypeError("OFD page resources cannot be shared across pages.");
    }
    this.objects.push({
      type: "image",
      image,
      options: freezeValue(options)
    });
    return this;
  }

  /**
   * Draws one reusable composite graphic owned by this layer's document.
   *
   * @param composite - Composite resource owned by this document.
   * @param options - Boundary, transform, clipping, and actions.
   * @returns This layer for fluent authoring.
   */
  drawComposite(
    composite: OFDCompositeGraphicUnit,
    options: OFDDrawCompositeOptions
  ): this {
    assertResourceOwner(this.documentIdentity, composite.documentIdentity);
    this.objects.push({ type: "composite", composite, options: freezeValue(options) });
    return this;
  }

  /**
   * Freezes this layer for deterministic compilation.
   *
   * @returns Immutable layer snapshot.
   * @internal
   */
  toSnapshot(): OFDLayerSnapshot {
    return {
      options: this.options,
      objects: Object.freeze(this.objects.map((object) =>
        object instanceof OFDPageBlock
          ? object.toSnapshot()
          : object
      ) satisfies OFDPageBlockChildSnapshot[])
    };
  }
}

/**
 * Rejects a resource from another document.
 *
 * @param documentIdentity - Expected owner.
 * @param resourceIdentity - Actual resource owner.
 */
function assertResourceOwner(
  documentIdentity: object,
  resourceIdentity: object
): void {
  if (documentIdentity !== resourceIdentity) {
    throw new TypeError("OFD resources cannot be shared across documents.");
  }
}

/**
 * Shallow-freezes one caller option value and its array fields.
 *
 * @param value - Caller-provided value.
 * @returns Frozen value.
 */
function freezeValue<T extends object>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}
