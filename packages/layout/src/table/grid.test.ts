import { describe, expect, it } from "vitest";
import {
  resolveQuireTableGridTracks,
  resolveQuireTableWidthToCssPixels
} from "./grid";
import type { QuireTableSourceColumn } from "./types";

describe("Quire table grid resolution", () => {
  it("resolves normalized width units to CSS pixels", () => {
    expect(resolveQuireTableWidthToCssPixels({ value: 96, unit: "px" }, 300))
      .toBe(96);
    expect(resolveQuireTableWidthToCssPixels({ value: 0.5, unit: "percent" }, 400))
      .toBe(200);
    expect(resolveQuireTableWidthToCssPixels({ value: 120, unit: "px" }, 400))
      .toBe(120);
    expect(resolveQuireTableWidthToCssPixels(null, 400)).toBeNull();
  });

  it("distributes unresolved columns across the remaining width", () => {
    const columns: readonly QuireTableSourceColumn[] = [
      {
        id: "table-0:col-0",
        columnIndex: 0,
        width: { value: 96, unit: "px" }
      },
      {
        id: "table-0:col-1",
        columnIndex: 1,
        width: null
      }
    ];

    expect(resolveQuireTableGridTracks({
      columns,
      x: 10,
      availableWidth: 300
    })).toEqual([
      { id: "table-0:col-0", columnIndex: 0, x: 10, width: 96 },
      { id: "table-0:col-1", columnIndex: 1, x: 106, width: 204 }
    ]);
  });

  it("shrinks fixed tracks proportionally into a narrower column", () => {
    const columns: readonly QuireTableSourceColumn[] = [200, 400].map(
      (width, columnIndex) => ({
        id: `table-0:col-${columnIndex}`,
        columnIndex,
        width: { value: width, unit: "px" }
      })
    );

    expect(resolveQuireTableGridTracks({
      columns,
      x: 0,
      availableWidth: 300,
      fitToWidth: true
    })).toEqual([
      { id: "table-0:col-0", columnIndex: 0, x: 0, width: 100 },
      { id: "table-0:col-1", columnIndex: 1, x: 100, width: 200 }
    ]);
    expect(resolveQuireTableGridTracks({ columns, x: 0, availableWidth: 300 })
      .map((track) => track.width)).toEqual([200, 400]);
  });

  it("keeps all-unresolved auto-fit tracks stable under wrapping content", () => {
    const columns: readonly QuireTableSourceColumn[] = [0, 1].map(
      (columnIndex) => ({
        id: `table-0:col-${columnIndex}`,
        columnIndex,
        width: null
      })
    );

    expect(resolveQuireTableGridTracks({
      columns,
      x: 0,
      availableWidth: 300,
      layoutMode: "auto-fit",
      cellConstraints: [
        {
          id: "edited-cell",
          startColumn: 0,
          columnSpan: 1,
          minWidth: 20,
          maxWidth: 280
        },
        {
          id: "short-cell",
          startColumn: 1,
          columnSpan: 1,
          minWidth: 20,
          maxWidth: 30
        }
      ]
    })).toEqual([
      { id: "table-0:col-0", columnIndex: 0, x: 0, width: 150 },
      { id: "table-0:col-1", columnIndex: 1, x: 150, width: 150 }
    ]);
  });

  it("rebalances auto-fit tracks to satisfy single-column max-content widths", () => {
    const columns: readonly QuireTableSourceColumn[] = [
      {
        id: "table-0:col-0",
        columnIndex: 0,
        width: { value: 69.5, unit: "px" }
      },
      {
        id: "table-0:col-1",
        columnIndex: 1,
        width: { value: 230.5, unit: "px" }
      }
    ];

    expect(resolveQuireTableGridTracks({
      columns,
      x: 0,
      availableWidth: 300,
      layoutMode: "auto-fit",
      cellConstraints: [
        {
          id: "label",
          startColumn: 0,
          columnSpan: 1,
          minWidth: 30,
          maxWidth: 70
        },
        {
          id: "value",
          startColumn: 1,
          columnSpan: 1,
          minWidth: 30,
          maxWidth: 180
        }
      ]
    })).toEqual([
      { id: "table-0:col-0", columnIndex: 0, x: 0, width: 70 },
      { id: "table-0:col-1", columnIndex: 1, x: 70, width: 230 }
    ]);
  });

  it("keeps fixed-layout tracks authoritative over intrinsic constraints", () => {
    const columns: readonly QuireTableSourceColumn[] = [
      {
        id: "table-0:col-0",
        columnIndex: 0,
        width: { value: 69.5, unit: "px" }
      },
      {
        id: "table-0:col-1",
        columnIndex: 1,
        width: { value: 230.5, unit: "px" }
      }
    ];

    expect(resolveQuireTableGridTracks({
      columns,
      x: 0,
      availableWidth: 300,
      layoutMode: "fixed",
      cellConstraints: [{
        id: "label",
        startColumn: 0,
        columnSpan: 1,
        minWidth: 30,
        maxWidth: 70
      }]
    })).toEqual([
      { id: "table-0:col-0", columnIndex: 0, x: 0, width: 69.5 },
      { id: "table-0:col-1", columnIndex: 1, x: 69.5, width: 230.5 }
    ]);
  });

  it("rebalances auto-fit tracks for spanning-cell max-content widths", () => {
    const columns: readonly QuireTableSourceColumn[] = [
      { id: "table-0:col-0", columnIndex: 0, width: { value: 20, unit: "px" } },
      { id: "table-0:col-1", columnIndex: 1, width: { value: 20, unit: "px" } },
      { id: "table-0:col-2", columnIndex: 2, width: { value: 60, unit: "px" } }
    ];

    expect(resolveQuireTableGridTracks({
      columns,
      x: 0,
      availableWidth: 100,
      layoutMode: "auto-fit",
      cellConstraints: [
        { id: "left", startColumn: 0, columnSpan: 1, minWidth: 10, maxWidth: 15 },
        { id: "middle", startColumn: 1, columnSpan: 1, minWidth: 10, maxWidth: 15 },
        { id: "right", startColumn: 2, columnSpan: 1, minWidth: 10, maxWidth: 40 },
        { id: "merged-label", startColumn: 0, columnSpan: 2, minWidth: 30, maxWidth: 50 }
      ]
    })).toEqual([
      { id: "table-0:col-0", columnIndex: 0, x: 0, width: 25 },
      { id: "table-0:col-1", columnIndex: 1, x: 25, width: 25 },
      { id: "table-0:col-2", columnIndex: 2, x: 50, width: 50 }
    ]);
  });

  it("does not overdraw donor width protected by another spanning cell", () => {
    const columns: readonly QuireTableSourceColumn[] = [20, 20, 40, 20].map(
      (value, columnIndex) => ({
        id: `table-0:col-${columnIndex}`,
        columnIndex,
        width: { value, unit: "px" as const }
      })
    );

    expect(resolveQuireTableGridTracks({
      columns,
      x: 0,
      availableWidth: 100,
      layoutMode: "auto-fit",
      cellConstraints: [
        { id: "c0", startColumn: 0, columnSpan: 1, minWidth: 10, maxWidth: 15 },
        { id: "c1", startColumn: 1, columnSpan: 1, minWidth: 10, maxWidth: 15 },
        { id: "c2", startColumn: 2, columnSpan: 1, minWidth: 10, maxWidth: 20 },
        { id: "c3", startColumn: 3, columnSpan: 1, minWidth: 10, maxWidth: 10 },
        { id: "receiver", startColumn: 0, columnSpan: 2, minWidth: 40, maxWidth: 60 },
        { id: "protected", startColumn: 2, columnSpan: 2, minWidth: 40, maxWidth: 50 }
      ]
    }).map((track) => track.width)).toEqual([25, 25, 35, 15]);
  });
});
