/** A task step; business data and validation remain owned by the host. */
export interface QuireKitStepsItem {
  /** Stable identity, unique within the sequence. */
  key: string;
  /** Visible step name. */
  title: string;
  /** Supporting task guidance. */
  description?: string;
  /** Visible error and recovery guidance, independent of position. */
  error?: string;
  /** Prevent navigation to this step; never implicitly skip it. */
  disabled?: boolean;
  /** Visible explanation of the unavailable step. */
  disabledReason?: string;
}
/** Process density, independent of single-line control height. */
export type QuireKitStepsDensity = 'compact' | 'comfortable';
/** Public step sequence contract. */
export interface QuireKitStepsProps {
  /** Accessible name of the ordered process. */
  label: string;
  /** Ordered steps; hosts synchronize the index when reordering. */
  items: readonly QuireKitStepsItem[];
  /** Zero-based current position; items.length is the completed position. */
  modelValue?: number | undefined;
  /** Initial uncontrolled position. */
  defaultValue?: number;
  /** Future steps require next(); completed steps can be revisited. */
  linear?: boolean;
  /** Layout direction, selected by the host for its available space. */
  orientation?: 'horizontal' | 'vertical';
  /** Indicator and process spacing, separate from Button size. */
  density?: QuireKitStepsDensity;
  /** Disable all navigation. */
  disabled?: boolean;
  /** Pause navigation while the host validates or submits asynchronously. */
  busy?: boolean;
  /** Synchronous current-step validity checked by Ark before forward navigation. */
  isStepValid?: (index: number) => boolean;
}
/** Public controls; each method delegates transitions to Ark. */
export interface StepsActions {
  /** Current normalized position. */
  index: number;
  /** Whether the next position is available; validation runs upon activation. */
  canNext: boolean;
  /** Whether the previous position is available. */
  canPrevious: boolean;
  /** Whether a nonempty sequence reached its ending position. */
  completed: boolean;
  /** Request the next step or the completed position. */
  next: () => void;
  /** Request the previous position without discarding drafts. */
  previous: () => void;
  /** Request a permitted title-navigation target. */
  goTo: (index: number) => void;
  /** Return to the first step; the host owns clearing business data. */
  reset: () => void;
}
/** Context for static step rendering and persistent content. */
export interface StepsItemContext {
  /** Original host item. */
  item: QuireKitStepsItem;
  /** Zero-based item position. */
  index: number;
  /** Whether this is the currently visible step. */
  current: boolean;
  /** Whether this position precedes the current step. */
  completed: boolean;
}
/** Content positions do not force a fixed action order. */
export interface StepsSlots {
  /** Static indicator content inside the title button. */
  indicator?: (context: StepsItemContext) => unknown;
  /** Mounted content for every step, hidden while inactive. */
  content?: (context: StepsItemContext) => unknown;
  /** Final task result; hosts arrange focus after successful submission. */
  completed?: () => unknown;
  /** Compose existing Buttons freely using the public controls. */
  actions?: (context: StepsActions) => unknown;
}
