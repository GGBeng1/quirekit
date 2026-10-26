/** Portable JSON metadata; it never supplies executable data semantics. */
export type DataJson = null | boolean | number | string | readonly DataJson[] | { readonly [key: string]: DataJson };
/** Supported cell storage, independent from presentation. */
export type DataValue = null | boolean | number | string | readonly string[];
/** Scalar field kinds. */
export type ScalarFieldType = "text" | "number" | "boolean" | "date" | "datetime";
/** Theme-independent semantic label color; consumers own its actual paint. */
export type DataOptionColor = "neutral" | "primary" | "info" | "success" | "warning" | "danger";
/** Authored spacing preference for a table view. */
export type DataTableDensity = "compact" | "standard" | "comfortable";
/** Aggregate over all matching records, ignoring empty cells. */
export type DataSummary = "count" | "sum" | "average";
/** Stable option identity with a user-editable label. */
export interface DataOption {
  /** Stable identity within this field. */
  readonly id: string;
  /** User-facing label. */
  readonly label: string;
  /** Optional stable semantic color, independent of the label and its order. */
  readonly color?: DataOptionColor;
}
/** Common field identity. */
export interface DataFieldBase {
  /** Stable identity within the dataset. */
  readonly id: string;
  /** User-facing name, which need not be unique. */
  readonly name: string;
}
/** Non-choice field. */
export interface DataScalarField extends DataFieldBase {
  /** Stored scalar kind. */
  readonly type: ScalarFieldType;
}
/** Single or multiple option references. */
export interface DataChoiceField extends DataFieldBase {
  /** Cardinality of the stored selection. */
  readonly type: "singleSelect" | "multiSelect";
  /** Ordered options, including empty board columns. */
  readonly options: readonly DataOption[];
}
/** One versioned field definition. */
export type DataField = DataScalarField | DataChoiceField;
/** A complete record; query projections use a separate contract. */
export interface DataRecord {
  /** Stable record identity. */
  readonly id: string;
  /** Exactly one value for every field. */
  readonly values: Readonly<Record<string, DataValue>>;
}
/** Complete, transport-independent dataset snapshot. */
export interface DataSet {
  /** File format discriminator. */
  readonly format: "quirekit-dataset";
  /** File protocol version. */
  readonly version: 1;
  /** Identity within the host namespace. */
  readonly id: string;
  /** Opaque equality-only data version. */
  readonly revision: string;
  /** Text field used as each record's title. */
  readonly primaryFieldId: string;
  /** Ordered field definitions. */
  readonly fields: readonly DataField[];
  /** Complete records, never a query page. */
  readonly records: readonly DataRecord[];
  /** Inert namespaced metadata, preserved during edits. */
  readonly extensions?: Readonly<Record<string, DataJson>>;
}
/** Typed comparison operators. */
export type DataComparison = "eq" | "neq" | "contains" | "lt" | "lte" | "gt" | "gte";
/** Portable filter expression. */
export type DataFilter =
  | { readonly all: readonly DataFilter[] }
  | { readonly any: readonly DataFilter[] }
  | { readonly fieldId: string; readonly op: "isEmpty" | "isNotEmpty" }
  | { readonly fieldId: string; readonly op: DataComparison; readonly value: string | number | boolean };
/** One explicit stable sort key. */
export interface DataSort {
  /** Field identity. */
  readonly fieldId: string;
  /** Value ordering. */
  readonly direction: "asc" | "desc";
  /** Null placement, independent of direction. */
  readonly nulls: "first" | "last";
}
/** Query applied before grouping and pagination. */
export interface DataQuery {
  /** Optional complete-data predicate. */
  readonly filter?: DataFilter;
  /** Ordered keys; record ID breaks ties. */
  readonly sort: readonly DataSort[];
}
/** Shared persistent view configuration. */
export interface DataViewBase {
  /** Identity within this embed. */
  readonly id: string;
  /** Author-specified label. */
  readonly name: string;
  /** Ordered visible fields. */
  readonly visibleFieldIds: readonly string[];
  /** Complete-data query. */
  readonly query: DataQuery;
}
/** Table projection. */
export interface DataTableView extends DataViewBase {
  /** View discriminator. */
  readonly type: "table";
  /** Optional authored column widths in CSS pixels. */
  readonly columnWidths?: Readonly<Record<string, number>>;
  /** Authored cell spacing; absence means standard. */
  readonly density?: DataTableDensity;
  /** Aggregation per field; sum and average require numeric fields. */
  readonly summaries?: Readonly<Record<string, DataSummary>>;
}
/** Board projection, grouped by a single-choice field. */
export interface DataBoardView extends DataViewBase {
  /** View discriminator. */
  readonly type: "board";
  /** Single-choice field identity. */
  readonly groupBy: string;
  /** Collapsed option IDs; null refers to unassigned records. */
  readonly collapsedGroups?: readonly (string | null)[];
  /** Whether cards show property labels; absence means true. */
  readonly showFieldNames?: boolean;
}
/** Persistent table or board view. */
export type DataView = DataTableView | DataBoardView;
/** Exactly one persistence authority. */
export type DataSource =
  | { readonly kind: "inline"; readonly dataset: DataSet }
  | { readonly kind: "resource"; readonly datasetId: string; readonly ref: string }
  | { readonly kind: "remote"; readonly provider: string; readonly datasetId: string; readonly endpoint?: string };
/** Portable document embed; runtime state is intentionally absent. */
export interface DataViewEmbed {
  /** File discriminator. */
  readonly format: "quirekit-data-view";
  /** File protocol version. */
  readonly version: 1;
  /** Stable document object identity. */
  readonly id: string;
  /** Dataset authority. */
  readonly source: DataSource;
  /** Independent projections over one source. */
  readonly views: readonly DataView[];
  /** Authored default, separate from the current user's tab. */
  readonly defaultViewId: string;
  /** Inert namespaced metadata. */
  readonly extensions?: Readonly<Record<string, DataJson>>;
}
