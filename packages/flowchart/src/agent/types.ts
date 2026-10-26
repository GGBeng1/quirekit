import type { FlowchartFieldKey } from "../modeling/types";
import type { FlowchartShape } from "../model/types";

/** One shape an Agent creates or changes, addressed by id. */
export interface FlowchartDiagramNodePatch {
  /** Stable node id; a new id creates the node. */ readonly id: string;
  /** Literal text. */ readonly text?: string;
  /** Shape; new nodes default to process. */ readonly shape?: FlowchartShape;
  /** Owning container id, or null for none. */ readonly parent?: string | null;
  /** World x; new nodes without coordinates are placed automatically. */ readonly x?: number;
  /** World y. */ readonly y?: number;
  /** Width, 20–10000. */ readonly width?: number;
  /** Height, 20–10000. */ readonly height?: number;
  /** UML class attributes, one per line. */ readonly attributes?: readonly string[];
  /** UML class operations, one per line. */ readonly operations?: readonly string[];
  /** ER entity fields. */ readonly fields?: readonly { readonly name: string; readonly type: string; readonly key?: FlowchartFieldKey }[];
}

/** One connection an Agent creates or changes, addressed by id. */
export interface FlowchartDiagramEdgePatch {
  /** Stable connection id; a new id creates the connection. */ readonly id: string;
  /** Source node id; required for a new connection. */ readonly from?: string;
  /** Target node id; required for a new connection. */ readonly to?: string;
  /** Literal label. */ readonly label?: string;
  /** Whether the line is dashed. */ readonly dashed?: boolean;
}

/** Incremental Agent edit of a flowchart graph. */
export interface FlowchartDiagramPatch {
  /** Plain title of the embedding. */ readonly title?: string;
  /** Nodes to create or change. */ readonly nodes?: readonly FlowchartDiagramNodePatch[];
  /** Connections to create or change. */ readonly edges?: readonly FlowchartDiagramEdgePatch[];
  /** Node or connection ids to delete; deleting a node deletes its connections. */ readonly remove?: readonly string[];
  /** Arranges every top-level node in layers. */ readonly layout?: "down" | "right";
}
