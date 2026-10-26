import { describe, expect, it, vi } from "vitest";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import {
  deferQuireLayerContributionBody,
  isQuireLayerContributionBodyPending,
  readQuireLayerContributionHeader,
  readQuireLayerContributionRealizationGaps,
  recordQuireLayerContributionRealizationGaps,
  rewriteQuireLayerContributionBody
} from "./deferred";
import type { QuireLayerContributionBody, QuireRetainedLayerContributionDeclaration } from "./types";

/** @returns One-command body. */
function createBody(): QuireLayerContributionBody {
  return {
    commands: [{ id: "handle", kind: "fill-rect", rect: { x: 1, y: 2, width: 3, height: 4 }, fillStyle: "#000" }],
    domOverlays: [],
    targets: [{ id: "target", nodePath: "0", rect: { x: 1, y: 2, width: 3, height: 4 }, events: {} }] as never
  };
}

/** Suffixes every command id, standing in for a pipeline stage. */
const shift = (body: QuireLayerContributionBody): QuireLayerContributionBody => ({
  ...body,
  commands: body.commands.map((command) => ({ ...command, id: `${command.id}:shifted` }) as QuireDisplayCommand)
});

describe("deferred layer contribution bodies", () => {
  it("produces the body once, on the first read of any artifact", () => {
    const produce = vi.fn(createBody);
    const contribution = deferQuireLayerContributionBody<QuireRetainedLayerContributionDeclaration>(
      { contributionId: "selection:a", rect: { x: 0, y: 0, width: 10, height: 10 } },
      produce
    );

    expect(readQuireLayerContributionHeader(contribution)).toEqual({
      contributionId: "selection:a",
      rect: { x: 0, y: 0, width: 10, height: 10 }
    });
    expect(isQuireLayerContributionBodyPending(contribution)).toBe(true);
    expect(produce).not.toHaveBeenCalled();

    expect(contribution.targets?.map((target) => target.id)).toEqual(["target"]);
    expect(contribution.commands?.map((command) => command.id)).toEqual(["handle"]);
    expect(produce).toHaveBeenCalledTimes(1);
    expect(isQuireLayerContributionBodyPending(contribution)).toBe(false);
  });

  it("chains rewrites without realizing, and realizes the same result as an eager rewrite", () => {
    const produce = vi.fn(createBody);
    const deferred = deferQuireLayerContributionBody<QuireRetainedLayerContributionDeclaration>(
      { contributionId: "selection:a" },
      produce
    );
    const rewritten = rewriteQuireLayerContributionBody(deferred, { contributionId: "selection:a:page:0" }, shift);

    expect(rewritten.contributionId).toBe("selection:a:page:0");
    expect(isQuireLayerContributionBodyPending(rewritten)).toBe(true);
    expect(produce).not.toHaveBeenCalled();

    const eager = rewriteQuireLayerContributionBody(
      { contributionId: "selection:a", ...createBody() } as QuireRetainedLayerContributionDeclaration,
      { contributionId: "selection:a:page:0" },
      shift
    );
    expect(isQuireLayerContributionBodyPending(eager)).toBe(false);
    expect({ ...rewritten }).toEqual(eager);
  });

  it("keeps an eager contribution's key order", () => {
    const eager = { contributionId: "a", commands: [], rect: { x: 0, y: 0, width: 1, height: 1 }, domOverlays: [], targets: [] };
    const rewritten = rewriteQuireLayerContributionBody(eager, { rect: { x: 1, y: 0, width: 1, height: 1 } }, (body) => body);
    expect(Object.keys(rewritten)).toEqual(Object.keys(eager));
  });

  it("reads realization gaps through later rewrites", () => {
    const deferred = deferQuireLayerContributionBody<QuireRetainedLayerContributionDeclaration>({ contributionId: "a" }, createBody);
    const rewritten = rewriteQuireLayerContributionBody(deferred, {}, shift);
    const gap = { code: "duplicate-layer-target-id", message: "duplicated" } as const;
    recordQuireLayerContributionRealizationGaps(deferred, [gap]);
    expect(readQuireLayerContributionRealizationGaps(rewritten)).toEqual([gap]);
  });
});
