import type { QuireKitSelectionHandleGeometry } from '../types';

/** A permanent DOM handle; hidden modes retain their nodes and event ownership. */
export interface SelectionHandleElements {
  /** Positioning and visibility owner. */
  readonly root: HTMLDivElement;
  /** Measurable caret line, independent of the enlarged hit target. */
  readonly stem: HTMLSpanElement;
  /** Native accessible drag and keyboard target. */
  readonly button: HTMLButtonElement;
}

/** Renderable geometry with an explicit visual placement. */
export interface SelectionHandlePresentation {
  /** Controlled local coordinates. */
  readonly geometry: QuireKitSelectionHandleGeometry;
  /** Above for the start of a range, below for its end or a caret. */
  readonly side: 'start' | 'end';
  /** Logical boundary marker, separate from the provisional grip placement. */
  readonly boundary: 'start' | 'end' | 'caret';
  /** Localized accessible label. */
  readonly label: string;
}
