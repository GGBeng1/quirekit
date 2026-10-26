import type { QuireAffineTransform, QuireRect } from "@quirekit/renderer";

/** Persistent clip shared by every directly owned batch in one content root. */
export interface QuireContentClip {
  /** Opacity of the complete drawing text. */
  readonly opacity?: number;
  /** Stable clip-family identity including the visual occurrence. */
  readonly id: string;
  /** Accepted document-space inner boundary before the transform. */
  readonly rect: QuireRect;
  /** Optional affine applied to the inner clip and every direct paint batch. */
  readonly transform?: QuireAffineTransform | undefined;
  /** Optional axis-aligned bounds after applying the transform. */
  readonly visualBounds?: QuireRect | undefined;
  /** Owning page boundary in final document space, outside the transform. */
  readonly pageRect?: QuireRect | undefined;
}
