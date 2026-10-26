/** Public composition slots; the caller owns all parameter drafts. */
export interface TaskPanelSlots {
  /** Real stable opening button with delegated widget bindings. */ readonly trigger?: (props: { /** Current accepted session visibility. */ readonly open: boolean }) => unknown;
  /** Interactive task content. */ readonly default: () => unknown;
  /** Explicit business submission and recovery controls. */ readonly footer?: () => unknown;
}
