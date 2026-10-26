/** Reactive root settings relevant to a pending keyboard-focus reveal. */
export interface TooltipFocusPolicy {
  /** Whether ancestor scrolling dismisses the Tooltip. */
  readonly closeOnScroll: boolean;
  /** Whether the entire Tooltip is disabled. */
  readonly disabled: boolean;
  /** The host's controlled state, when present. */
  readonly open: boolean | undefined;
}
