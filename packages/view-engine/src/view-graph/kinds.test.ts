import { describe, expect, it } from "vitest";
import {
  quireLayoutCapabilityKinds,
  quireLayoutExportFallbackKinds,
  quireLayoutRegionKinds,
  quireLayoutRootKinds
} from "@quirekit/layout/identity";
import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants
} from "./kinds";
import { validateQuireViewGraphSnapshot } from "./validate";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import type {
  QuireViewGraphPerformanceContract,
  QuireViewGraphSnapshot
} from "./types";

const allCapabilitiesEnabled: QuireLayoutCapabilitySet = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};

const requiredPerformance: QuireViewGraphPerformanceContract = {
  invariants: quireViewGraphRequiredPerformanceInvariants,
  invalidationScopes: quireViewGraphRequiredInvalidationScopeKinds.map(
    (kind) => ({
      kind
    })
  ),
  queryBudget: {
    kind: "viewport-indexed",
    label: "canonical view graph queries"
  }
};

/**
 * Returns whether a list has no duplicate entries.
 *
 * @param values - Values to inspect.
 * @returns True when every value appears once.
 */
function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe("view graph contract kinds", () => {
  it("keeps canonical kind sets unique", () => {
    expect(hasUniqueValues(quireLayoutRootKinds)).toBe(true);
    expect(hasUniqueValues(quireLayoutRegionKinds)).toBe(true);
    expect(hasUniqueValues(quireLayoutCapabilityKinds)).toBe(true);
    expect(hasUniqueValues(quireLayoutExportFallbackKinds)).toBe(true);
    expect(hasUniqueValues(quireViewGraphRequiredPerformanceInvariants)).toBe(
      true
    );
    expect(hasUniqueValues(quireViewGraphRequiredInvalidationScopeKinds)).toBe(
      true
    );
  });

  it("keeps the first contract broad enough for Word and modern blocks", () => {
    expect(quireLayoutRegionKinds).toEqual([
      "body",
      "header",
      "footer",
      "footnote",
      "endnote",
      "section",
      "page-decoration",
      "watermark",
      "table-cell",
      "floating-object",
      "text-box",
      "drawing-text",
      "readonly-text",
      "node-body",
      "block-container",
      "media",
      "embed",
      "content-control",
      "interactive-widget",
      "control"
    ]);
    expect(quireLayoutExportFallbackKinds).toEqual([
      "native",
      "semantic-degraded",
      "visual-snapshot",
      "plain-text",
      "omitted-interaction"
    ]);
    expect(quireViewGraphRequiredPerformanceInvariants).toEqual([
      "versioned-snapshots",
      "typed-invalidation",
      "layout-paint-dirty-split",
      "viewport-indexed-queries",
      "retained-display-chunks",
      "no-per-pointer-layout",
      "no-display-list-geometry-reconstruction",
      "speculative-composition-layout",
      "batched-browser-measurement",
      "stable-target-identities",
      "versioned-cancelable-async-jobs"
    ]);
  });

  it("represents a minimal retained graph snapshot", () => {
    const bodyRegion: QuireLayoutRegionRef = {
      rootId: { value: "root:body" },
      regionId: { value: "region:body" },
      kind: "body"
    };
    const snapshot: QuireViewGraphSnapshot = {
      version: 1,
      performance: requiredPerformance,
      roots: [
        {
          id: bodyRegion.rootId,
          kind: "body",
          source: {
            sourceId: "doc:body",
            range: { from: 0, to: 10 }
          },
          capabilities: allCapabilitiesEnabled,
          exportFallbacks: [
            {
              kind: "native",
              targetFormat: "docx"
            }
          ]
        }
      ],
      regions: [
        {
          ref: bodyRegion,
          source: {
            sourceId: "doc:body",
            range: { from: 0, to: 10 }
          },
          rect: { x: 0, y: 0, width: 320, height: 240 },
          coordinateSpace: "document",
          capabilities: allCapabilitiesEnabled
        }
      ]
    };

    expect(snapshot.regions[0]?.ref.kind).toBe("body");
    expect(snapshot.roots[0]?.exportFallbacks?.[0]?.kind).toBe("native");
    expect(validateQuireViewGraphSnapshot(snapshot).valid).toBe(true);
  });

  it("rejects missing roots and duplicate region keys", () => {
    const bodyRegion: QuireLayoutRegionRef = {
      rootId: { value: "root:body" },
      regionId: { value: "region:body" },
      kind: "body"
    };
    const snapshot: QuireViewGraphSnapshot = {
      version: 1,
      performance: requiredPerformance,
      roots: [],
      regions: [
        {
          ref: bodyRegion,
          capabilities: allCapabilitiesEnabled
        },
        {
          ref: bodyRegion,
          capabilities: allCapabilitiesEnabled
        }
      ]
    };

    expect(
      validateQuireViewGraphSnapshot(snapshot).issues.map((issue) => issue.code)
    ).toEqual([
      "missing-region-root",
      "missing-region-root",
      "duplicate-region"
    ]);
  });

  it("rejects missing required performance invariants", () => {
    const snapshot: QuireViewGraphSnapshot = {
      version: 1,
      performance: {
        ...requiredPerformance,
        invariants: requiredPerformance.invariants.filter(
          (invariant) => invariant !== "no-per-pointer-layout"
        )
      },
      roots: [],
      regions: []
    };

    expect(
      validateQuireViewGraphSnapshot(snapshot).issues.map((issue) => issue.code)
    ).toContain("missing-performance-invariant");
  });

  it("rejects unbounded scan query budgets", () => {
    const snapshot: QuireViewGraphSnapshot = {
      version: 1,
      performance: {
        ...requiredPerformance,
        queryBudget: {
          kind: "scan-bounded"
        }
      },
      roots: [],
      regions: []
    };

    expect(
      validateQuireViewGraphSnapshot(snapshot).issues.map((issue) => issue.code)
    ).toContain("invalid-query-budget");
  });
});
