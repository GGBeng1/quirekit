import type { ComputedRef, Ref } from 'vue';

/** Responsive picker container, independent of the selected value. */
export type PickerPresentation = 'auto' | 'desktop' | 'bottom';
/** Private surface context; each picker continues to own its value and draft. */
export interface PickerSurfaceContext {
  /** Resident field container for viewport resolution and outside-interaction guards; excludes popup geometry ownership. */ readonly anchor: Ref<HTMLElement | undefined>;
  /** Whether this opening uses a full-width modal sheet. */ readonly bottom: ComputedRef<boolean>;
  /** Current public visibility. */ readonly open: ComputedRef<boolean>;
  /** Opens from a field interaction, retaining desktop editing focus. */ readonly openField: (event: Event) => void;
}
/** Private shared root inputs. */
export interface PickerSurfaceProps {
  /** Controlled visibility from the owning picker. */ readonly open: boolean;
  /** Responsive strategy; auto follows the layout viewport. */ readonly presentation?: PickerPresentation | undefined;
  /** Accessible title of the mobile sheet. */ readonly label: string;
  /** Whether field focus and click can open the picker. */ readonly openOnFocus?: boolean;
  /** Editing is forbidden for disabled or read-only fields. */ readonly disabled?: boolean;
  /** Panel target for explicit icon/keyboard opening. */ readonly initialFocusEl?: () => HTMLElement | null;
  /** Stable icon target after dismissal. */ readonly finalFocusEl?: () => HTMLElement | null;
}
