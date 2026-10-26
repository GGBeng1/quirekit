import type { SimpleInstance } from "../../vendor/types";
import type { createMindMapStructure } from "../structure";

/** Authorities shared by a single command implementation and its lifecycle controller. */
export interface MindMapCommandContext {
  /** Owned rendering and history runtime. */ readonly instance: SimpleInstance;
  /** Canonical forest mutation boundary. */ readonly structure: ReturnType<typeof createMindMapStructure>;
  /** Rejects unavailable writes, including permission changes after enqueue. */ readonly assertWritable: () => void;
  /** Rejects closed or composing sessions. */ readonly assertActive: () => void;
  /** Cancels an unfinished pointer preview before a structural command. */ readonly cancel: () => void;
}
