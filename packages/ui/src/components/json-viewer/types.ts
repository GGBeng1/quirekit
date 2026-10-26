/** The two ways to read the same unmodified JSON source. */
export type QuireKitJsonViewerView = 'tree' | 'source';

/** Read-only JSON inspection; the original source remains the copy authority. */
export interface QuireKitJsonViewerProps {
  /** Original JSON text, including its formatting and trailing whitespace. */
  readonly source: string;
  /** Accessible name for the viewer; defaults to the language pack's label. */
  readonly label?: string;
  /** Controlled view; invalid or oversized JSON always falls back to source. */
  readonly view?: QuireKitJsonViewerView;
  /** Initial view when view is uncontrolled. */
  readonly defaultView?: QuireKitJsonViewerView;
  /** Maximum source characters parsed for the tree. Larger input remains readable as source. */
  readonly maxTreeCharacters?: number;
  /** Maximum nesting rendered in the tree before directing the reader to source. */
  readonly maxDepth?: number;
  /** Initial number of children rendered per branch; more can be revealed on demand. */
  readonly pageSize?: number;
  /** Initial visible length of one scalar value; the reader can reveal the rest. */
  readonly maxValueLength?: number;
  /** Height of the scrollable reading area in CSS pixels. */
  readonly maxHeight?: number;
}
