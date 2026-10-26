import { describe, expect, it, vi } from "vitest";
import { QuireTableMeasurementCache } from "./measurement";
import { createQuireTableGridTrackVariantKey } from "./keys";
import { QuireTableGridTrackCache } from "./grid-tracks";

const textMeasurer = {
  measureText: (text: string) => ({ width: text.length })
};

const environment = {
  textMeasurer,
  textMeasurerVersion: undefined,
  font: "16px sans-serif",
  lineHeight: 24,
  textBaselineOffset: 18,
  lineBreakMode: "unicode"
};

describe("QuireTableMeasurementCache", () => {
  it("reuses exact cell measurements and delegates shifted projection", () => {
    const cache = new QuireTableMeasurementCache();
    const sourceIdentity = {};
    const build = vi.fn(() => ({
      height: 24,
      children: [{ id: "paragraph", range: { from: 2, to: 8 } }]
    }));
    const project = vi.fn((layout, _previousRange, currentRange) => ({
      ...layout,
      children: [{ id: "paragraph", range: currentRange }]
    }));
    const request = {
      key: {
        tableId: "table",
        semanticCellId: "cell",
        sourceIdentity,
        sourceRange: { from: 2, to: 8 },
        contentWidth: 120,
        blockHeight: 24
      },
      build,
      project
    };

    const first = cache.readCell(request);
    const exact = cache.readCell(request);
    const shifted = cache.readCell({
      ...request,
      key: { ...request.key, sourceRange: { from: 12, to: 18 } }
    });

    expect(exact).toBe(first);
    expect(shifted.children[0]?.range).toEqual({ from: 12, to: 18 });
    expect(build).toHaveBeenCalledOnce();
    expect(project).toHaveBeenCalledOnce();
  });

  it("invalidates measurement products when shaping authority changes", () => {
    const cache = new QuireTableMeasurementCache();
    const build = vi.fn(() => ({ height: 20, children: [] }));
    const request = {
      key: {
        tableId: "table",
        semanticCellId: "cell",
        sourceIdentity: {},
        sourceRange: { from: 1, to: 2 },
        contentWidth: 80,
        blockHeight: 20
      },
      build
    };

    cache.prepare(environment);
    cache.readCell(request);
    cache.readCell(request);
    cache.prepare({ ...environment, font: "18px sans-serif" });
    cache.readCell(request);

    expect(build).toHaveBeenCalledTimes(2);
    expect(cache.snapshot()).toMatchObject({ cellHits: 1, cellMisses: 2 });
  });
});

describe("createQuireTableGridTrackVariantKey", () => {
  it("uses structural columns instead of normalized source object identity", () => {
    const createKey = () => createQuireTableGridTrackVariantKey({
      tableId: "table",
      layoutMode: "fixed",
      columns: [{
        id: "column-0",
        columnIndex: 0,
        width: { unit: "px", value: 120 }
      }],
      x: 10,
      availableWidth: 240,
      cellSpacing: 2,
      inlineMetricsSignature: null
    });

    expect(createKey()).toBe(createKey());
  });
});

describe("QuireTableGridTrackCache", () => {
  it("reuses equivalent normalized columns and evicts per table", () => {
    const cache = new QuireTableGridTrackCache();
    const build = vi.fn(() => [{
      id: "column-0",
      columnIndex: 0,
      x: 0,
      width: 120
    }]);
    const request = {
      key: {
        tableId: "table",
        layoutMode: "fixed" as const,
        columns: [{
          id: "column-0",
          columnIndex: 0,
          width: { unit: "px" as const, value: 120 }
        }],
        x: 0,
        availableWidth: 120,
        cellSpacing: 0,
        inlineMetricsSignature: null
      },
      build
    };

    cache.read(request);
    cache.read({
      ...request,
      key: {
        ...request.key,
        columns: request.key.columns.map((column) => ({ ...column }))
      }
    });
    cache.deleteTable("table");
    cache.read(request);

    expect(build).toHaveBeenCalledTimes(2);
    expect(cache.snapshot()).toEqual({ hits: 1, misses: 2 });
  });
});
