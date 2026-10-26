import { describe, expect, it } from "vitest";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { createQuireLayoutJobCoordinator } from "../coordinator";
import { createQuireMainThreadLayoutJobExecutor } from "../main-thread";
import { QUIRE_LAYOUT_JOB_PROTOCOL_VERSION } from "../protocol";
import type { QuireLayoutJobRequest } from "../types";
import { createQuireBackgroundShapingJobHandler } from "./handler";
import type {
  QuireBackgroundShapingCapabilitySnapshot,
  QuireBackgroundShapingJobPayload
} from "./types";

const capabilities: QuireBackgroundShapingCapabilitySnapshot = {
  measurement: {
    id: "test-native-metrics",
    version: 1,
    mode: "measure-only",
    transferability: "local-only"
  },
  lineBreakerName: null
};

const textMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: Array.from(text).length * 10 })
};

/**
 * Builds a pre-resolved shaping payload without live editor identities.
 *
 * @returns Clone-safe shaping payload for two wrapped blocks.
 */
function payload(): QuireBackgroundShapingJobPayload {
  return {
    capabilities,
    blocks: [
      {
        attachmentKey: "node:paragraph:1",
        id: "doc:0",
        runs: [
          {
            text: "one two",
            range: { from: 1, to: 8 },
            font: "16px sans-serif",
            marks: []
          }
        ],
        width: 40,
        lineHeight: 20,
        textBaselineOffset: 15,
        lineBreakMode: "word",
        baseDirection: "auto"
      },
      {
        attachmentKey: "node:paragraph:2",
        id: "doc:1",
        runs: [
          {
            text: "three",
            range: { from: 10, to: 15 },
            font: "16px sans-serif",
            marks: ["bold"]
          }
        ],
        width: 100,
        lineHeight: 20,
        textBaselineOffset: 15,
        lineBreakMode: "word",
        baseDirection: "ltr"
      }
    ]
  };
}

/**
 * Builds a background shaping request.
 *
 * @param jobPayload - Job-owned clone-safe payload.
 * @returns Versioned background shaping request.
 */
function request(jobPayload: unknown = payload()): QuireLayoutJobRequest {
  return {
    protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
    jobId: "shape:background:1",
    supersessionScope: "shape:background",
    kind: "background-shaping",
    stateVersion: 7,
    layoutEpoch: 4,
    dirtyRange: null,
    window: { kind: "blocks", fromIndex: 2, toIndex: 4 },
    cacheHints: {
      retainedBlockKeys: ["doc:0"],
      paginationCheckpointKeys: [],
      tableProductKeys: []
    },
    payload: jobPayload
  };
}

describe("background shaping layout job", () => {
  it("shapes pre-resolved runs into clone-safe renderer-neutral fragments", () => {
    const handler = createQuireBackgroundShapingJobHandler({
      capabilities,
      textMeasurer
    });
    const output = handler(request());

    expect(output.blocks.map((block) => block.attachmentKey)).toEqual([
      "node:paragraph:1",
      "node:paragraph:2"
    ]);
    expect(output.blocks[0]!.fragments.length).toBeGreaterThan(1);
    expect(output.blocks[1]!.fragments).toHaveLength(1);
    expect(structuredClone(output)).toEqual(output);
  });

  it("rejects malformed payloads as explicit migration gaps", async () => {
    const executor = createQuireMainThreadLayoutJobExecutor({
      "background-shaping": createQuireBackgroundShapingJobHandler({
        capabilities,
        textMeasurer
      })
    });

    await expect(executor.submit(request({ blocks: [] }))).resolves.toMatchObject({
      status: "failed",
      code: "invalid-payload"
    });
  });

  it("rejects payloads compiled for a different runtime capability", async () => {
    const executor = createQuireMainThreadLayoutJobExecutor({
      "background-shaping": createQuireBackgroundShapingJobHandler({
        capabilities,
        textMeasurer
      })
    });
    const mismatched = payload();

    await expect(executor.submit(request({
      ...mismatched,
      capabilities: {
        ...mismatched.capabilities,
        measurement: {
          ...mismatched.capabilities.measurement,
          version: 2
        }
      }
    }))).resolves.toMatchObject({
      status: "failed",
      code: "capability-mismatch"
    });
  });

  it("fails fast when a live runtime contradicts its capability snapshot", () => {
    expect(() => createQuireBackgroundShapingJobHandler({
      capabilities: {
        ...capabilities,
        measurement: {
          ...capabilities.measurement,
          mode: "cluster-shaping"
        }
      },
      textMeasurer
    })).toThrow(/does not describe the local runtime/u);
  });

  it("runs through the same coordinator freshness authority as future workers", async () => {
    const executor = createQuireMainThreadLayoutJobExecutor({
      "background-shaping": createQuireBackgroundShapingJobHandler({
        capabilities,
        textMeasurer
      })
    });
    const coordinator = createQuireLayoutJobCoordinator({
      executor,
      readCurrentRevision: () => ({ stateVersion: 7, layoutEpoch: 4 })
    });
    const submitted = request();
    const outcome = await coordinator.submit(submitted);

    expect(outcome).toMatchObject({
      accepted: true,
      result: {
        status: "success",
        jobId: submitted.jobId,
        stateVersion: submitted.stateVersion,
        layoutEpoch: submitted.layoutEpoch
      }
    });
    expect(coordinator.snapshot()).toMatchObject({
      submitted: 1,
      completed: 1,
      accepted: 1
    });
  });
});
