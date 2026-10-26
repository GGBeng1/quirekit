import type { MindMapNode } from "../../model/types";
import type { XmindContext } from "../types";

/** One workbook's projection authority. */
export interface XmindExportContext {
  /** Bounded conversion differences. */ readonly report: XmindContext;
  /** Archive-local resources. */ readonly resources: Map<string, Uint8Array>;
  /** Shared image payloads receive one resource identity. */ readonly images: Map<string, string>;
}

/** Complete topic identity and sibling ownership for annotation projection. */
export interface XmindExportTopic {
  /** Canonical topic. */ readonly node: MindMapNode;
  /** Mutable output record until the workbook is assembled. */ readonly output: Record<string, unknown>;
  /** Attached sibling parent, absent for independent roots. */ readonly parent?: XmindExportTopic;
  /** Index in the ordered attached sibling list. */ readonly index: number;
}
