import type { QuireKitTableProps } from "../../components/table";

/** Vue resolves absent optional props to undefined while preserving required input. */
export type TableInteractionProps<Row> = Pick<QuireKitTableProps<Row>, "rows" | "columns" | "rowKey"> & {
  readonly [Key in Exclude<keyof QuireKitTableProps<Row>, "rows" | "columns" | "rowKey">]?: QuireKitTableProps<Row>[Key] | undefined;
};
