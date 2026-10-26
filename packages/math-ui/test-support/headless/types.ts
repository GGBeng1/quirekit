import type { MathEditor } from '@quirekit/math';
import type { MathBrowserBinding } from '@quirekit/math/browser';

/** Consumer-owned DOM view; it borrows every formula authority. */
export interface StandaloneMathView {
  /** Public native binding, exposed here for browser contract assertions. */
  readonly binding: MathBrowserBinding;
  /**
   * Models a framework delaying its DOM commit without delaying core input acceptance.
   * @param paused - Whether graphic installation is temporarily withheld.
   */
  pauseGraphic(paused: boolean): void;
  /** Stops this view while leaving the borrowed editor and its history alive. */
  destroy(): void;
}
/** One external application's ownership of model and view lifetimes. */
export interface StandaloneMathInstance {
  /** Framework-independent core. */
  readonly editor: MathEditor;
  /** Current consumer-owned view. */
  view: StandaloneMathView | undefined;
  /** Container supplied by the external application. */
  readonly host: HTMLElement;
}
