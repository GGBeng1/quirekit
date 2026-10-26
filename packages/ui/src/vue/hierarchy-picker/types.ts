import type { QuireKitTreeNode } from '../../components/tree-view';

/** Shared hierarchical field contract. */
export interface QuireKitHierarchyPickerProps {
  /** Accessible field name. */
  readonly label: string;
  /** Complete hierarchy with globally unique ids. */
  readonly nodes: readonly QuireKitTreeNode[];
  /** Controlled selection; use [] to clear. */
  readonly modelValue?: string[] | undefined;
  /** Uncontrolled initial selection and native form reset value. */
  readonly defaultValue?: string[] | undefined;
  /** Controlled popup state. */
  readonly open?: boolean | undefined;
  /** Initial popup state. */
  readonly defaultOpen?: boolean | undefined;
  /** Enables full-path search. */
  readonly searchable?: boolean | undefined;
  /** Empty field text; defaults to the language pack. */
  readonly placeholder?: string | undefined;
  /** Search input hint; defaults to the language pack. */
  readonly searchPlaceholder?: string | undefined;
  /** Shows a separate clear action. */
  readonly clearable?: boolean | undefined;
  /** Disables interaction and native submission. */
  readonly disabled?: boolean | undefined;
  /** Preserves submission while preventing edits. */
  readonly readOnly?: boolean | undefined;
  /** Marks an invalid field. */
  readonly invalid?: boolean | undefined;
  /** Requires at least one selected value. */
  readonly required?: boolean | undefined;
  /** Native form field name; repeated for each selected id. */
  readonly name?: string | undefined;
  /** External native form id. */
  readonly form?: string | undefined;
  /** Field width, constrained by its parent. */
  readonly width?: string | undefined;
  /** Moves the popup through the existing modal-aware portal. */
  readonly portalled?: boolean | undefined;
}

/** One node and its full path in input order. */
export interface HierarchyEntry {
  /** Original node with inherited disabled state. */
  readonly node: QuireKitTreeNode;
  /** Ancestors followed by this node. */
  readonly path: readonly QuireKitTreeNode[];
  /** True for a known terminal node. */
  readonly leaf: boolean;
  /** Human-readable full path. */
  readonly text: string;
}

/** Model notifications shared by both public fields. */
export interface HierarchyPickerEmits {
  /** Requests a new selection. */
  'update:modelValue': [value: string[]];
  /** Reports a committed selection or clear/reset. */
  valueChange: [value: string[]];
  /** Requests popup state. */
  'update:open': [open: boolean];
  /** Reports a popup transition. */
  openChange: [open: boolean];
}
