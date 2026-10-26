import type { Node as PMNode, NodeType } from "@quirekit/pm";

/** Word table node types required by command helpers. */
export interface WordTableCommandNodeTypes {
  /** Table node type. */
  readonly table: NodeType;
  /** Row node type. */
  readonly row: NodeType;
  /** Cell node type. */
  readonly cell: NodeType;
  /** Paragraph node type used for empty cell content. */
  readonly paragraph: NodeType;
}

/** Cell with its resolved one-row grid range. */
export interface WordTableRowCellRange {
  /** Source cell node. */
  readonly cell: PMNode;
  /** Source cell index within the row. */
  readonly cellIndex: number;
  /** Start column after row `gridBefore`. */
  readonly startColumn: number;
  /** Resolved column span. */
  readonly columnSpan: number;
}
