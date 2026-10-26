/** Inputs for the touch tap recognizer shared by mounted backends. */
export interface MountedTouchTapOptions {
  /** Document owning event continuation and teardown. */
  readonly ownerDocument: Document;
  /** Stable document interaction planes, excluding product controls. */
  readonly targets: readonly EventTarget[];
  /** Revalidates mounted input ownership at release. @param event - Native touch release. @returns Whether another owner consumes it. */
  readonly ignore?: ((event: PointerEvent) => boolean) | undefined;
  /** Runs hit testing and focus in the trusted release event. @param event - Accepted touch release. */
  readonly tap: (event: PointerEvent) => void;
}
