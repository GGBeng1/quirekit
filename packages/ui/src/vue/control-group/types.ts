/** Axis along which adjacent controls share an edge. */
export type QuireKitControlGroupOrientation = 'horizontal' | 'vertical';

/** Visual connection of controls; each child retains its own form and keyboard semantics. */
export interface QuireKitControlGroupProps {
  /** Connected axis. Defaults to horizontal and follows the inherited writing direction. */
  readonly orientation?: QuireKitControlGroupOrientation;
  /** Fill the available width. Horizontal inputs share the remaining width after fixed actions. */
  readonly block?: boolean;
}
