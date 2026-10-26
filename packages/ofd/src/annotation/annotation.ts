import type {
  OFDDrawImageOptions,
  OFDDrawPathOptions,
  OFDDrawTextOptions
} from "../model";
import type { OFDImage } from "../resources";
import { OFDAnnotationAppearance } from "./appearance";
import type { OFDAnnotationSnapshot } from "./state";
import type { OFDAnnotationOptions } from "./types";

/** One typed page-local annotation with a mutable static appearance. */
export class OFDAnnotation {
  /** Static appearance that owns the annotation's paint tree. */
  readonly appearance: OFDAnnotationAppearance;

  /**
   * Creates one internal annotation.
   *
   * @param documentIdentity - Identity of the owning document.
   * @param options - Frozen annotation properties.
   */
  constructor(
    documentIdentity: object,
    private readonly options: Readonly<OFDAnnotationOptions>
  ) {
    this.appearance = new OFDAnnotationAppearance(
      documentIdentity,
      options.boundary
    );
  }

  /**
   * Adds a nested page block to the static appearance.
   *
   * @returns New nested appearance page block.
   */
  addPageBlock(): ReturnType<OFDAnnotationAppearance["addPageBlock"]> {
    return this.appearance.addPageBlock();
  }

  /**
   * Draws text directly in the static appearance.
   *
   * @param text - Authored Unicode text.
   * @param options - Font, boundary, placement, and paint.
   * @returns This annotation for fluent authoring.
   */
  drawText(text: string, options: OFDDrawTextOptions): this {
    this.appearance.drawText(text, options);
    return this;
  }

  /**
   * Draws a path directly in the static appearance.
   *
   * @param options - Boundary, path operations, and paint.
   * @returns This annotation for fluent authoring.
   */
  drawPath(options: OFDDrawPathOptions): this {
    this.appearance.drawPath(options);
    return this;
  }

  /**
   * Draws an image directly in the static appearance.
   *
   * @param image - Image resource owned by the same document.
   * @param options - Boundary, transform, clipping, and border.
   * @returns This annotation for fluent authoring.
   */
  drawImage(image: OFDImage, options: OFDDrawImageOptions): this {
    this.appearance.drawImage(image, options);
    return this;
  }

  /**
   * Freezes this annotation and its complete appearance tree.
   *
   * @returns Immutable annotation snapshot.
   * @internal
   */
  toSnapshot(): OFDAnnotationSnapshot {
    return {
      options: this.options,
      appearance: this.appearance.toAnnotationSnapshot()
    };
  }
}
