import { driveQuireMeasuredContainerPages } from "@quirekit/layout/pagination";
import type { QuireLayoutJobRequest } from "../types";
import { requireRemainderPaginationPayload } from "./validation";
import type { QuireRemainderPaginationJobOutput } from "./types";

/**
 * Executes pure page driving over a clone-safe measured container.
 *
 * @param request - Versioned remainder pagination request.
 * @returns Complete renderer-neutral page stream.
 */
export function handleQuireRemainderPaginationJob(
  request: QuireLayoutJobRequest
): QuireRemainderPaginationJobOutput {
  const payload = requireRemainderPaginationPayload(request.payload);
  const result = driveQuireMeasuredContainerPages({
    container: payload.container,
    pageGeometry: payload.pageGeometry,
    ...(payload.widows === undefined ? {} : { widows: payload.widows }),
    ...(payload.orphans === undefined ? {} : { orphans: payload.orphans })
  });
  return {
    requestKey: payload.requestKey,
    geometryKey: payload.geometryKey,
    fragments: result.fragments
  };
}
