import { writeQuirePreparedPaginationResult } from "@quirekit/layout/pagination";
import { createQuirePaginationGeometryKey } from "@quirekit/view-engine";
import { QuireLayoutJobExecutionError } from "../errors";
import type {
  CompileQuireRemainderPaginationBatchOptions,
  QuireCompiledRemainderPaginationBatch
} from "./types";
import { requireRemainderPaginationOutput } from "./validation";

/**
 * Compiles one measured flow into clone-safe pagination work and attachment authority.
 *
 * @param options - Measured flow, page policy, identity, and retained store.
 * @returns Clone-safe payload with accepted-output attachment closure.
 */
export function compileQuireRemainderPaginationBatch(
  options: CompileQuireRemainderPaginationBatchOptions
): QuireCompiledRemainderPaginationBatch {
  const geometryKey = createQuirePaginationGeometryKey({
    pageGeometry: options.pageGeometry,
    widows: options.widows,
    orphans: options.orphans
  });
  const payload = {
    requestKey: options.requestKey,
    container: options.container,
    pageGeometry: options.pageGeometry,
    ...(options.widows === undefined ? {} : { widows: options.widows }),
    ...(options.orphans === undefined ? {} : { orphans: options.orphans }),
    geometryKey
  };

  return {
    payload,
    attachAcceptedOutput(output: unknown) {
      const accepted = requireRemainderPaginationOutput(output);
      if (
        accepted.requestKey !== options.requestKey
        || accepted.geometryKey !== geometryKey
      ) {
        throw new QuireLayoutJobExecutionError(
          "invalid-payload",
          "Remainder pagination output does not match its attachment authority."
        );
      }
      writeQuirePreparedPaginationResult(
        options.paginationCheckpointStore,
        options.container,
        geometryKey,
        accepted.fragments
      );
      return { attachedPageCount: accepted.fragments.length };
    }
  };
}
