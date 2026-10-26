import { OFDPageBlock } from "../document/page-block";
import type { OFDBox } from "../model";
import type { OFDAnnotationAppearanceSnapshot } from "./state";

/** A drawable, recursively nestable static presentation for one annotation. */
export class OFDAnnotationAppearance extends OFDPageBlock {
  /**
   * Creates an appearance with its page-coordinate boundary.
   *
   * @param documentIdentity - Identity of the owning document.
   * @param boundary - Required appearance boundary.
   */
  constructor(
    documentIdentity: object,
    private readonly boundary: Readonly<OFDBox>
  ) {
    super(documentIdentity);
  }

  /**
   * Freezes the appearance while retaining the standard Boundary separately.
   *
   * @returns Immutable appearance snapshot.
   * @internal
   */
  toAnnotationSnapshot(): OFDAnnotationAppearanceSnapshot {
    return {
      boundary: this.boundary,
      children: this.toSnapshot().children
    };
  }
}
