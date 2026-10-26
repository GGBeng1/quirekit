/** Visual key annotation; it does not execute a database constraint. */
export type FlowchartFieldKey = "none" | "primary" | "foreign" | "primary-foreign";
/** One literal, ordered entity field. */
export interface FlowchartEntityField {
  /** Single-line field name, at most 300 characters. */ readonly name: string;
  /** Literal type description, not an SQL expression. */ readonly type: string;
  /** Visible primary/foreign key annotation. */ readonly key: FlowchartFieldKey;
}
/** Editable entity compartment. */
export interface FlowchartEntity {
  /** Ordered rows, at most 100; empty entities are valid. */ readonly fields: readonly FlowchartEntityField[];
}
/** Literal UML class members; visibility and signatures remain author text. */
export interface FlowchartUmlClass {
  /** Ordered single-line attributes, at most 100. */ readonly attributes: readonly string[];
  /** Ordered single-line operations, at most 100. */ readonly operations: readonly string[];
}
/** Atomic content changes, independent of position and formatting. */
export interface FlowchartNodeContent {
  /** Literal node title. */ readonly text: string;
  /** Required for uml-class shapes; rejected on other shapes. */ readonly uml?: FlowchartUmlClass;
  /** Required for entity shapes; rejected on other shapes. */ readonly entity?: FlowchartEntity;
}
