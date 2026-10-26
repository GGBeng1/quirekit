import type {
  QuireLayoutSnapshotOptions,
  QuireRetainedLayoutSnapshot
} from "../types";
import type { QuireRetainedBlockLayoutGraph } from "../../layout/retained-block";
import { buildEngineLayoutSnapshot } from "./engine";

/**
 * Builds a deterministic layout snapshot from the editor state document.
 *
 * The recursive block-flow engine is the single path for plain text and
 * provider-owned containers at any nesting depth.
 *
 * @param options - State and viewport inputs for layout snapshot creation.
 * @param retainedBlockGraph - Optional retained block graph owned by the mounted consumer.
 * @returns Layout snapshot containing a document root and direct block children.
 */
export function buildQuireLayoutSnapshot(
  options: QuireLayoutSnapshotOptions,
  retainedBlockGraph?: QuireRetainedBlockLayoutGraph
): QuireRetainedLayoutSnapshot {
  return buildEngineLayoutSnapshot(options, retainedBlockGraph);
}
