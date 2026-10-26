import type { MathDocument, MathRenderer } from '@quirekit/math';

/** One mounted consumer's ownership of a renderer lifetime. */
export interface FormulaRendererLease {
  /** Private editor service or shared bounded gallery service. */
  readonly renderer: MathRenderer;
  /** Releases this consumer; the last gallery release disposes the pool. */
  release(): void;
}
/** Dependencies of one controlled formula presentation. */
export interface FormulaPresentationOptions {
  /** Requests complete interactive slots rather than a presentation image. */
  readonly editable?: boolean;
  /** Hidden, already-mounted previews do not request layout. */
  readonly visible?: () => boolean;
}
/** Readonly SVG preview without editor or input ownership. */
export interface FormulaSvgProps {
  /** Complete admitted example document. */
  readonly document: MathDocument;
  /** Whether an already-mounted preview is visible; defaults to true. */
  readonly visible?: boolean;
}
