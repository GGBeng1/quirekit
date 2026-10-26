import { describe, expect, it } from "vitest";
import {
  matchesQuireLayoutJobIdentity,
  QUIRE_LAYOUT_JOB_PROTOCOL_VERSION
} from "./protocol";
import type {
  QuireLayoutJobRequest,
  QuireLayoutJobResult
} from "./types";

/**
 * Builds one clone-safe shaping request.
 *
 * @param overrides - Request fields to replace for one assertion.
 * @returns Versioned layout job request.
 */
function request(
  overrides: Partial<QuireLayoutJobRequest> = {}
): QuireLayoutJobRequest {
  return {
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: "shape:1",
    supersessionScope: "shape:background",
    kind: "background-shaping",
    stateVersion: 4,
    layoutEpoch: 2,
    dirtyRange: {
      reason: "content",
      changedRange: { from: 10, to: 12 },
      firstTopLevelBlockIndex: 1,
      firstTopLevelBlockRange: { from: 8, to: 20 },
      textEdit: { from: 10, inserted: 2, deleted: 0 }
    },
    window: { kind: "blocks", fromIndex: 1, toIndex: 5 },
    cacheHints: {
      retainedBlockKeys: ["block:0"],
      paginationCheckpointKeys: ["page:0"],
      tableProductKeys: []
    },
    payload: { blocks: [{ type: "paragraph", text: "hello" }] },
    ...overrides
  };
}

/**
 * Builds one successful result for a request.
 *
 * @param source - Request identity to echo.
 * @returns Successful clone-safe result.
 */
function success(source: QuireLayoutJobRequest): QuireLayoutJobResult {
  return {
    status: "success",
    protocolVersion: source.protocolVersion,
    jobId: source.jobId,
    stateVersion: source.stateVersion,
    layoutEpoch: source.layoutEpoch,
    output: { shapedBlockKeys: ["block:1"] }
  };
}

describe("layout job protocol", () => {
  it("keeps request and result envelopes structured-clone safe", () => {
    const submitted = request();
    const completed = success(submitted);

    expect(structuredClone(submitted)).toEqual(submitted);
    expect(structuredClone(completed)).toEqual(completed);
  });

  it("matches only exact request revision identity", () => {
    const submitted = request();
    const completed = success(submitted);

    expect(matchesQuireLayoutJobIdentity(submitted, completed)).toBe(true);
    expect(matchesQuireLayoutJobIdentity(submitted, {
      ...completed,
      layoutEpoch: submitted.layoutEpoch + 1
    })).toBe(false);
    expect(matchesQuireLayoutJobIdentity(submitted, {
      ...completed,
      stateVersion: submitted.stateVersion + 1
    })).toBe(false);
    expect(matchesQuireLayoutJobIdentity(submitted, {
      ...completed,
      jobId: "shape:other"
    })).toBe(false);
  });
});
