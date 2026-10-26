import type { QuireKitHierarchyPickerProps } from '../hierarchy-picker/types';

/** Tree field selection and independent expansion. */
export interface QuireKitTreeSelectProps extends QuireKitHierarchyPickerProps {
  /** Single node or cascading multiple terminal nodes. */
  readonly selectionMode?: 'single' | 'multiple';
  /** Restricts single selection to terminal nodes; multiple always selects leaves. */
  readonly leafOnly?: boolean;
  /** Controlled expanded node ids, independent from selection. */
  readonly expandedValue?: string[];
  /** Initial expanded node ids. */
  readonly defaultExpandedValue?: string[];
}
