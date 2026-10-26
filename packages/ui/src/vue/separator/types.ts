/** Physical line orientation; vertical lines default to inline text geometry. */
export type QuireKitSeparatorOrientation = 'horizontal' | 'vertical';
/** Logical content placement; start follows the inherited writing direction. */
export type QuireKitSeparatorPosition = 'start' | 'center' | 'end';
/** Boundary pattern without changing its semantic width or color. */
export type QuireKitSeparatorType = 'solid' | 'dashed' | 'dotted';
/** Static content boundary; interactive controls belong beside the separator. */
export interface QuireKitSeparatorProps {
  /** Line direction. Defaults to horizontal. */
  orientation?: QuireKitSeparatorOrientation;
  /** Stretches a vertical separator to its flex/grid row. Defaults to false; ignored horizontally. */
  stretch?: boolean;
  /** Optional text naming the boundary; the default slot takes precedence. */
  label?: string;
  /** Label placement along the line. Defaults to center. */
  position?: QuireKitSeparatorPosition;
  /** Line pattern. Defaults to solid. */
  type?: QuireKitSeparatorType;
  /** Removes separator semantics, while keeping visible label text readable. */
  decorative?: boolean;
}
