import type {
  OFDDrawImageOptions,
  OFDDrawCompositeOptions,
  OFDDrawPathOptions,
  OFDDrawTextOptions
} from "../model";
import type { OFDGraphicObjectState } from "../model/types";
import type { OFDCompositeGraphicUnit, OFDImage } from "../resources";
import { OFDPageImage } from "./page-resources";
import { resolveOFDDrawTextOptions } from "../text";
import type {
  OFDPageBlockChildSnapshot,
  OFDPageBlockSnapshot
} from "./state";

/** Nested ordered container for page graphic objects and further page blocks. */
export class OFDPageBlock {
  private readonly children: (OFDGraphicObjectState | OFDPageBlock)[] = [];

  /**
   * Creates one internal page block.
   *
   * @param documentIdentity - Identity of the document that owns this block.
   */
  constructor(
    private readonly documentIdentity: object,
    private readonly pageIdentity: object | undefined = undefined
  ) {}

  /**
   * Adds a nested page block after the current block's existing children.
   *
   * @returns New nested page block.
   */
  addPageBlock(): OFDPageBlock {
    const block = new OFDPageBlock(this.documentIdentity, this.pageIdentity);
    this.children.push(block);
    return block;
  }

  /**
   * Draws explicitly positioned text in this page block.
   *
   * @param text - Authored Unicode text.
   * @param options - Font, boundary, placement, and paint.
   * @returns This page block for fluent authoring.
   */
  drawText(text: string, options: OFDDrawTextOptions): this {
    assertResourceOwner(this.documentIdentity, options.font.documentIdentity);
    this.children.push({
      type: "text",
      text,
      options: resolveOFDDrawTextOptions(text, options)
    });
    return this;
  }

  /**
   * Draws a typed path in this page block.
   *
   * @param options - Boundary, path operations, and paint.
   * @returns This page block for fluent authoring.
   */
  drawPath(options: OFDDrawPathOptions): this {
    this.children.push({ type: "path", options: freezeValue(options) });
    return this;
  }

  /**
   * Draws an embedded image in this page block.
   *
   * @param image - Image resource owned by the same document.
   * @param options - Boundary, transform, clipping, and border.
   * @returns This page block for fluent authoring.
   */
  drawImage(image: OFDImage | OFDPageImage, options: OFDDrawImageOptions): this {
    assertResourceOwner(this.documentIdentity, image.documentIdentity);
    if (image instanceof OFDPageImage && image.pageIdentity !== this.pageIdentity) {
      throw new TypeError("OFD page resources cannot be shared across pages.");
    }
    this.children.push({
      type: "image",
      image,
      options: freezeValue(options)
    });
    return this;
  }

  /**
   * Draws one reusable composite graphic in this nested page block.
   *
   * @param composite - Composite resource owned by this document.
   * @param options - Boundary, transform, clipping, and actions.
   * @returns This page block for fluent authoring.
   */
  drawComposite(
    composite: OFDCompositeGraphicUnit,
    options: OFDDrawCompositeOptions
  ): this {
    assertResourceOwner(this.documentIdentity, composite.documentIdentity);
    this.children.push({ type: "composite", composite, options: freezeValue(options) });
    return this;
  }

  /**
   * Freezes this block and its descendants for deterministic compilation.
   *
   * @returns Immutable page-block snapshot.
   * @internal
   */
  toSnapshot(): OFDPageBlockSnapshot {
    return {
      type: "page-block",
      children: Object.freeze(this.children.map((child) =>
        child instanceof OFDPageBlock
          ? child.toSnapshot()
          : child
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
 * Shallow-freezes one caller option value and its immediate fields.
 *
 * @param value - Caller-provided value.
 * @returns Frozen value.
 */
function freezeValue<T extends object>(value: T): Readonly<T> {
  return Object.freeze({ ...value });
}
