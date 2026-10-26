import { describe, expect, it } from "vitest";
import { createC1QuireTableBorderCandidates } from "../fallback-candidates";
import { resolveQuireTableBorderSegments } from "./resolve";
import type {
  QuireTableBorderCandidate,
  QuireTableGeometrySnapshot
} from "../../types";

const snapshot = {
  tableId: "table-0",
  geometryId: "table-0",
  tableRange: { from: 0, to: 20 },
  style: {
    backgroundColor: null,
    borderColor: "#cbd5e1",
    borderWidth: 1
  },
  borders: null,
  rect: { x: 10, y: 20, width: 300, height: 56 },
  tracks: [
    { id: "table-0:col-0", columnIndex: 0, x: 10, width: 150 },
    { id: "table-0:col-1", columnIndex: 1, x: 160, width: 150 }
  ],
  rows: [
      {
        id: "table-0:row-0",
        sourceRowId: "row:r0",
        rowIndex: 0,
        isHeader: false,
        cantSplit: false,
        range: { from: 2, to: 12 },
        rect: { x: 10, y: 20, width: 300, height: 28 }
      },
    {
        id: "table-0:row-1",
        sourceRowId: "row:r1",
        rowIndex: 1,
        isHeader: false,
        cantSplit: false,
        range: { from: 14, to: 18 },
        rect: { x: 10, y: 48, width: 300, height: 28 }
      }
  ],
  cells: [],
} satisfies QuireTableGeometrySnapshot;

describe("Quire table border resolver", () => {
  it("lets a direct nil border suppress inherited visible borders", () => {
    const candidates: readonly QuireTableBorderCandidate[] = [
      createCandidate("empty-cell", {
        style: "nil",
        width: 8,
        color: "ff0000",
        spacing: null
      }, 10),
      createCandidate("thin-table", {
        style: "single",
        width: 1,
        color: "00ff00",
        spacing: null
      }, 1),
      createCandidate("wide-inside", {
        style: "single",
        width: 2,
        color: "0000ff",
        spacing: null
      }, 0)
    ];

    expect(resolveQuireTableBorderSegments({ snapshot, candidates })).toEqual([]);
  });

  it("uses source priority when concrete candidates have equal width", () => {
    const candidates: readonly QuireTableBorderCandidate[] = [
      createCandidate("inside", {
        style: "single",
        width: 1,
        color: "0000ff",
        spacing: null
      }, 1),
      createCandidate("cell", {
        style: "single",
        width: 1,
        color: "0000ff",
        spacing: null
      }, 3)
    ];

    expect(resolveQuireTableBorderSegments({ snapshot, candidates })).toEqual([
      expect.objectContaining({
        id: "cell",
        strokeStyle: "#0000ff",
        lineWidth: 1
      })
    ]);
  });

  it("uses style and color for equal-priority equal-width candidates", () => {
    const styleCandidates: readonly QuireTableBorderCandidate[] = [
      createCandidate("cell-single", {
        style: "single",
        width: 1,
        color: "0000ff",
        spacing: null
      }, 0),
      createCandidate("inside-double", {
        style: "double",
        width: 1,
        color: "00ff00",
        spacing: null
      }, 0)
    ];
    const colorCandidates: readonly QuireTableBorderCandidate[] = [
      createCandidate("inside-blue", {
        style: "single",
        width: 1,
        color: "0000ff",
        spacing: null
      }, 0),
      createCandidate("cell-red", {
        style: "single",
        width: 1,
        color: "ff0000",
        spacing: null
      }, 0)
    ];

    expect(resolveQuireTableBorderSegments({
      snapshot,
      candidates: styleCandidates
    })).toEqual([
      expect.objectContaining({
        id: "inside-double",
        strokeStyle: "#00ff00"
      })
    ]);
    expect(resolveQuireTableBorderSegments({
      snapshot,
      candidates: colorCandidates
    })).toEqual([
      expect.objectContaining({
        id: "cell-red",
        strokeStyle: "#ff0000"
      })
    ]);
  });

  it("creates C1 row and column border segments from table geometry", () => {
    expect(resolveQuireTableBorderSegments({ snapshot })).toEqual([
      expect.objectContaining({
        id: "table-0:border-top-0",
        line: { from: { x: 10, y: 20 }, to: { x: 310, y: 20 } }
      }),
      expect.objectContaining({
        id: "table-0:border-top-1",
        line: { from: { x: 10, y: 48 }, to: { x: 310, y: 48 } }
      }),
      expect.objectContaining({
        id: "table-0:border-bottom-1",
        line: { from: { x: 10, y: 76 }, to: { x: 310, y: 76 } }
      }),
      expect.objectContaining({
        id: "table-0:border-left-0",
        line: { from: { x: 10, y: 20 }, to: { x: 10, y: 76 } }
      }),
      expect.objectContaining({
        id: "table-0:border-left-1",
        line: { from: { x: 160, y: 20 }, to: { x: 160, y: 76 } }
      }),
      expect.objectContaining({
        id: "table-0:border-right-1",
        line: { from: { x: 310, y: 20 }, to: { x: 310, y: 76 } }
      })
    ]);
  });

  it("uses cell-edge fallback borders when cell spacing separates boxes", () => {
    const separatedSnapshot = {
      ...snapshot,
      cellSpacing: 8,
      rect: { x: 10, y: 20, width: 300, height: 80 },
      tracks: [
        { id: "table-0:col-0", columnIndex: 0, x: 18, width: 138 },
        { id: "table-0:col-1", columnIndex: 1, x: 164, width: 138 }
      ],
      rows: [
        {
          ...snapshot.rows[0]!,
          rect: { x: 18, y: 28, width: 284, height: 28 }
        },
        {
          ...snapshot.rows[1]!,
          rect: { x: 18, y: 64, width: 284, height: 28 }
        }
      ],
      cells: [
        createCell("cell-r0-c0", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 18, y: 28, width: 138, height: 28 }),
        createCell("cell-r0-c1", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 164, y: 28, width: 138, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;
    const segments = resolveQuireTableBorderSegments({
      snapshot: separatedSnapshot
    });
    const topSegments = segments.filter((segment) =>
      segment.line.from.y === 28 && segment.line.to.y === 28
    );

    expect(topSegments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        line: { from: { x: 18, y: 28 }, to: { x: 156, y: 28 } }
      }),
      expect.objectContaining({
        line: { from: { x: 164, y: 28 }, to: { x: 302, y: 28 } }
      })
    ]));
    expect(topSegments).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        line: { from: { x: 18, y: 28 }, to: { x: 302, y: 28 } }
      })
    ]));

    const candidates = createC1QuireTableBorderCandidates(separatedSnapshot);
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "table-0:border-top:cell-r0-c0",
        source: "table",
        priority: 1
      }),
      expect.objectContaining({
        id: "table-0:border-left:cell-r0-c0",
        source: "table",
        priority: 1
      })
    ]));
  });

  it("uses cell-edge fallback borders when only a row spacing separates boxes", () => {
    const rowSeparatedSnapshot = {
      ...snapshot,
      cellSpacing: 0,
      rect: { x: 10, y: 20, width: 300, height: 60 },
      tracks: [
        { id: "table-0:col-0", columnIndex: 0, x: 26, width: 126 },
        { id: "table-0:col-1", columnIndex: 1, x: 168, width: 126 }
      ],
      rows: [
        {
          ...snapshot.rows[0]!,
          cellSpacing: 16,
          rect: { x: 26, y: 36, width: 268, height: 28 }
        }
      ],
      cells: [
        createCell("cell-r0-c0", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 26, y: 36, width: 126, height: 28 }),
        createCell("cell-r0-c1", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 168, y: 36, width: 126, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;
    const segments = resolveQuireTableBorderSegments({
      snapshot: rowSeparatedSnapshot
    });
    const topSegments = segments.filter((segment) =>
      segment.line.from.y === 36 && segment.line.to.y === 36
    );

    expect(topSegments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        line: { from: { x: 26, y: 36 }, to: { x: 152, y: 36 } }
      }),
      expect.objectContaining({
        line: { from: { x: 168, y: 36 }, to: { x: 294, y: 36 } }
      })
    ]));
    expect(topSegments).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        line: { from: { x: 26, y: 36 }, to: { x: 294, y: 36 } }
      })
    ]));
  });

  it("classifies source outside borders from separated cell edges", () => {
    const tableBorders = {
      top: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      right: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      bottom: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      left: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      insideH: { style: "single", width: 1, color: "00aa55", spacing: 0 },
      insideV: { style: "single", width: 1, color: "00aa55", spacing: 0 }
    };
    const separatedSnapshot = {
      ...snapshot,
      cellSpacing: 8,
      borders: tableBorders,
      rect: { x: 10, y: 20, width: 300, height: 80 },
      tracks: [
        { id: "table-0:col-0", columnIndex: 0, x: 18, width: 138 },
        { id: "table-0:col-1", columnIndex: 1, x: 164, width: 138 }
      ],
      rows: [
        {
          ...snapshot.rows[0]!,
          rect: { x: 18, y: 28, width: 284, height: 28 }
        },
        {
          ...snapshot.rows[1]!,
          rect: { x: 18, y: 64, width: 284, height: 28 }
        }
      ],
      cells: [
        createCell("cell-r0-c0", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 18, y: 28, width: 138, height: 28 }),
        createCell("cell-r0-c1", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 164, y: 28, width: 138, height: 28 }),
        createCell("cell-r1-c0", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 18, y: 64, width: 138, height: 28 }),
        createCell("cell-r1-c1", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 164, y: 64, width: 138, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;

    const segments = resolveQuireTableBorderSegments({
      snapshot: separatedSnapshot
    });

    expect(segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "cell-r0-c0:border-top:table",
        strokeStyle: "#ff0000",
        line: { from: { x: 18, y: 28 }, to: { x: 156, y: 28 } }
      }),
      expect.objectContaining({
        id: "cell-r0-c0:border-left:table",
        strokeStyle: "#ff0000",
        line: { from: { x: 18, y: 28 }, to: { x: 18, y: 56 } }
      }),
      expect.objectContaining({
        id: "cell-r1-c1:border-right:table",
        strokeStyle: "#ff0000",
        line: { from: { x: 302, y: 64 }, to: { x: 302, y: 92 } }
      }),
      expect.objectContaining({
        id: "cell-r1-c1:border-bottom:table",
        strokeStyle: "#ff0000",
        line: { from: { x: 164, y: 92 }, to: { x: 302, y: 92 } }
      })
    ]));
    expect(segments).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        line: { from: { x: 18, y: 28 }, to: { x: 156, y: 28 } },
        strokeStyle: "#00aa55"
      })
    ]));
  });

  it("suppresses C1 fallback borders inside merged cell spans", () => {
    const mergedSnapshot = {
      ...snapshot,
      rect: { x: 10, y: 20, width: 300, height: 84 },
      rows: [
        snapshot.rows[0]!,
        snapshot.rows[1]!,
        {
          id: "table-0:row-2",
          sourceRowId: "row:r2",
          rowIndex: 2,
          isHeader: false,
          cantSplit: false,
          range: { from: 20, to: 24 },
          rect: { x: 10, y: 76, width: 300, height: 28 }
        }
      ],
      cells: [
        createCell("cell-horizontal", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 2
        }, { x: 10, y: 20, width: 300, height: 28 }),
        createCell("cell-vertical", {
          startRow: 1,
          rowSpan: 2,
          startColumn: 0,
          columnSpan: 1
        }, { x: 10, y: 48, width: 150, height: 56 }),
        createCell("cell-r1-c1", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 48, width: 150, height: 28 }),
        createCell("cell-r2-c1", {
          startRow: 2,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 76, width: 150, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;

    const segments = resolveQuireTableBorderSegments({ snapshot: mergedSnapshot });
    const innerVerticalSegments = segments
      .filter((segment) =>
        segment.line.from.x === 160 &&
        segment.line.to.x === 160
      )
      .map((segment) => ({
        fromY: segment.line.from.y,
        toY: segment.line.to.y
      }));

    expect(hasVerticalSegmentCrossing(segments, 160, 20, 48)).toBe(false);
    expect(hasHorizontalSegmentCrossing(segments, 76, 10, 160)).toBe(false);
    expect(hasVerticalSegmentCrossing(segments, 160, 48, 104)).toBe(true);
    expect(hasHorizontalSegmentCrossing(segments, 76, 160, 310)).toBe(true);
    expect(innerVerticalSegments).toEqual([
      { fromY: 48, toY: 76 },
      { fromY: 76, toY: 104 }
    ]);
  });

  it("resolves source table and cell borders on shared cell edges", () => {
    const tableBorders = {
      top: { style: "single", width: 1, color: "ff0000", spacing: 0 },
      right: null,
      bottom: null,
      left: null,
      insideH: null,
      insideV: { style: "single", width: 1, color: "00ff00", spacing: 0 }
    };
    const cellBorders = {
      top: null,
      right: { style: "single", width: 2, color: "0000ff", spacing: 0 },
      bottom: null,
      left: null,
      insideH: null,
      insideV: null
    };
    const sourceSnapshot = {
      ...snapshot,
      borders: tableBorders,
      cells: [
        {
          id: "table-0:cell-0-0",
          semanticCellId: "semantic:r0:c0:g1:1",
          originExplicitCellId: "cell:r0:c0:g0:1",
          explicitCellIds: ["cell:r0:c0:g0:1"],
          originCellPos: 2,
          range: { from: 2, to: 6 },
          shading: null,
          backgroundColor: null,
          borders: cellBorders,
          cellMargins: null,
          preferredWidth: null,
          gridRect: {
            startRow: 0,
            rowSpan: 1,
            startColumn: 0,
            columnSpan: 1
          },
          rect: { x: 10, y: 20, width: 150, height: 28 },
          contentRect: { x: 15, y: 25, width: 140, height: 18 }
        },
        {
          id: "table-0:cell-0-1",
          semanticCellId: "semantic:r0:c1:g1:1",
          originExplicitCellId: "cell:r0:c1:g1:1",
          explicitCellIds: ["cell:r0:c1:g1:1"],
          originCellPos: 8,
          range: { from: 8, to: 12 },
          shading: null,
          backgroundColor: null,
          borders: null,
          cellMargins: null,
          preferredWidth: null,
          gridRect: {
            startRow: 0,
            rowSpan: 1,
            startColumn: 1,
            columnSpan: 1
          },
          rect: { x: 160, y: 20, width: 150, height: 28 },
          contentRect: { x: 165, y: 25, width: 140, height: 18 }
        }
      ]
    } satisfies QuireTableGeometrySnapshot;

    const segments = resolveQuireTableBorderSegments({ snapshot: sourceSnapshot });
    const sharedVertical = segments.filter((segment) =>
      segment.line.from.x === 160 &&
      segment.line.from.y === 20 &&
      segment.line.to.x === 160 &&
      segment.line.to.y === 48
    );

    expect(sharedVertical).toHaveLength(1);
    expect(segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "table-0:cell-0-0:border-top:table",
        strokeStyle: "#ff0000",
        line: { from: { x: 10, y: 20 }, to: { x: 160, y: 20 } }
      }),
      expect.objectContaining({
        id: "table-0:cell-0-0:border-right:cell",
        strokeStyle: "#0000ff",
        lineWidth: 2,
        line: { from: { x: 160, y: 20 }, to: { x: 160, y: 48 } }
      })
    ]));
  });

  it("uses page-local fragment bounds for source outside borders", () => {
    const tableBorders = {
      top: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      right: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      bottom: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      left: { style: "single", width: 2, color: "ff0000", spacing: 0 },
      insideH: { style: "single", width: 1, color: "00aa55", spacing: 0 },
      insideV: null
    };
    const pageLocalSnapshot = {
      ...snapshot,
      geometryId: "table-0#p2",
      borders: tableBorders,
      rect: { x: 10, y: 220, width: 300, height: 28 },
      rows: [{
        id: "table-0:row-43#p2",
        sourceRowId: "row:r43",
        rowIndex: 43,
        isHeader: false,
        cantSplit: false,
        range: { from: 400, to: 420 },
        rect: { x: 10, y: 220, width: 300, height: 28 }
      }],
      cells: [
        createCell("cell-r43-c0", {
          startRow: 43,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 10, y: 220, width: 150, height: 28 }),
        createCell("cell-r43-c1", {
          startRow: 43,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 220, width: 150, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;

    const segments = resolveQuireTableBorderSegments({
      snapshot: pageLocalSnapshot
    });

    expect(segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "cell-r43-c0:border-bottom:table",
        strokeStyle: "#ff0000",
        lineWidth: 2,
        line: { from: { x: 10, y: 248 }, to: { x: 160, y: 248 } },
        paintRect: { x: 10, y: 247, width: 150, height: 2 },
        hitRect: { x: 10, y: 245, width: 150, height: 6 }
      }),
      expect.objectContaining({
        id: "cell-r43-c1:border-bottom:table",
        strokeStyle: "#ff0000",
        lineWidth: 2,
        line: { from: { x: 160, y: 248 }, to: { x: 310, y: 248 } },
        paintRect: { x: 160, y: 247, width: 150, height: 2 },
        hitRect: { x: 160, y: 245, width: 150, height: 6 }
      })
    ]));
    expect(segments).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        line: { from: { x: 10, y: 248 }, to: { x: 160, y: 248 } },
        strokeStyle: "#00aa55"
      })
    ]));
  });

  it("resolves row borders between table inside and cell candidates", () => {
    const tableBorders = {
      top: null,
      right: null,
      bottom: null,
      left: null,
      insideH: { style: "single", width: 1, color: "00aa55", spacing: 0 },
      insideV: null
    };
    const rowBorders = {
      top: null,
      right: null,
      bottom: { style: "single", width: 3, color: "0000ff", spacing: 0 },
      left: null,
      insideH: null,
      insideV: null
    };
    const rowSnapshot = {
      ...snapshot,
      borders: tableBorders,
      rows: [
        {
          ...snapshot.rows[0]!,
          borders: rowBorders
        },
        {
          ...snapshot.rows[1]!,
          borders: null
        }
      ],
      cells: [
        createCell("cell-r0-c0", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 10, y: 20, width: 150, height: 28 }),
        createCell("cell-r0-c1", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 20, width: 150, height: 28 }),
        createCell("cell-r1-c0", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 10, y: 48, width: 150, height: 28 }),
        createCell("cell-r1-c1", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 48, width: 150, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;

    const segments = resolveQuireTableBorderSegments({ snapshot: rowSnapshot });
    const sharedHorizontal = segments.filter((segment) =>
      segment.line.from.y === 48 &&
      segment.line.to.y === 48
    );

    expect(sharedHorizontal).toEqual([
      expect.objectContaining({
        id: "cell-r0-c0:border-bottom:row",
        strokeStyle: "#0000ff",
        lineWidth: 3,
        line: { from: { x: 10, y: 48 }, to: { x: 160, y: 48 } }
      }),
      expect.objectContaining({
        id: "cell-r0-c1:border-bottom:row",
        strokeStyle: "#0000ff",
        lineWidth: 3,
        line: { from: { x: 160, y: 48 }, to: { x: 310, y: 48 } }
      })
    ]);
  });

  it("resolves row inside vertical borders against table inside borders", () => {
    const tableBorders = {
      top: null,
      right: null,
      bottom: null,
      left: null,
      insideH: null,
      insideV: { style: "single", width: 1, color: "00aa55", spacing: 0 }
    };
    const rowBorders = {
      top: null,
      right: null,
      bottom: null,
      left: null,
      insideH: null,
      insideV: { style: "single", width: 3, color: "0000ff", spacing: 0 }
    };
    const rowSnapshot = {
      ...snapshot,
      borders: tableBorders,
      rows: [
        {
          ...snapshot.rows[0]!,
          borders: rowBorders
        },
        {
          ...snapshot.rows[1]!,
          borders: null
        }
      ],
      cells: [
        createCell("cell-r0-c0", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 10, y: 20, width: 150, height: 28 }),
        createCell("cell-r0-c1", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 20, width: 150, height: 28 }),
        createCell("cell-r1-c0", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 0,
          columnSpan: 1
        }, { x: 10, y: 48, width: 150, height: 28 }),
        createCell("cell-r1-c1", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 48, width: 150, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;

    const segments = resolveQuireTableBorderSegments({ snapshot: rowSnapshot });
    const sharedVertical = segments.filter((segment) =>
      segment.line.from.x === 160 &&
      segment.line.to.x === 160
    );

    expect(sharedVertical).toEqual([
      expect.objectContaining({
        strokeStyle: "#0000ff",
        lineWidth: 3,
        line: { from: { x: 160, y: 20 }, to: { x: 160, y: 48 } }
      }),
      expect.objectContaining({
        strokeStyle: "#00aa55",
        lineWidth: 1,
        line: { from: { x: 160, y: 48 }, to: { x: 160, y: 76 } }
      })
    ]);
  });

  it("clips row inside vertical borders along row-spanning cell edges", () => {
    const tableBorders = {
      top: null,
      right: null,
      bottom: null,
      left: null,
      insideH: null,
      insideV: { style: "single", width: 1, color: "00aa55", spacing: 0 }
    };
    const rowBorders = {
      top: null,
      right: null,
      bottom: null,
      left: null,
      insideH: null,
      insideV: { style: "single", width: 3, color: "0000ff", spacing: 0 }
    };
    const rowSpanSnapshot = {
      ...snapshot,
      borders: tableBorders,
      rows: [
        {
          ...snapshot.rows[0]!,
          borders: rowBorders
        },
        {
          ...snapshot.rows[1]!,
          borders: null
        }
      ],
      cells: [
        createCell("cell-span", {
          startRow: 0,
          rowSpan: 2,
          startColumn: 0,
          columnSpan: 1
        }, { x: 10, y: 20, width: 150, height: 56 }),
        createCell("cell-r0-c1", {
          startRow: 0,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 20, width: 150, height: 28 }),
        createCell("cell-r1-c1", {
          startRow: 1,
          rowSpan: 1,
          startColumn: 1,
          columnSpan: 1
        }, { x: 160, y: 48, width: 150, height: 28 })
      ]
    } satisfies QuireTableGeometrySnapshot;

    const segments = resolveQuireTableBorderSegments({
      snapshot: rowSpanSnapshot
    });
    const sharedVertical = segments.filter((segment) =>
      segment.line.from.x === 160 &&
      segment.line.to.x === 160
    );

    expect(sharedVertical).toEqual([
      expect.objectContaining({
        strokeStyle: "#0000ff",
        lineWidth: 3,
        line: { from: { x: 160, y: 20 }, to: { x: 160, y: 48 } }
      }),
      expect.objectContaining({
        strokeStyle: "#00aa55",
        lineWidth: 1,
        line: { from: { x: 160, y: 48 }, to: { x: 160, y: 76 } }
      })
    ]);
  });

  it("splits overlapping collinear candidates into atomic resolved segments", () => {
    const candidates: readonly QuireTableBorderCandidate[] = [
      createCandidate("inside-long", {
        style: "single",
        width: 1,
        color: "00ff00",
        spacing: null
      }, 0, {
        from: { x: 160, y: 20 },
        to: { x: 160, y: 76 }
      }),
      createCandidate("cell-short", {
        style: "single",
        width: 2,
        color: "0000ff",
        spacing: null
      }, 3, {
        from: { x: 160, y: 20 },
        to: { x: 160, y: 48 }
      })
    ];

    expect(resolveQuireTableBorderSegments({ snapshot, candidates })).toEqual([
      expect.objectContaining({
        id: "cell-short",
        line: { from: { x: 160, y: 20 }, to: { x: 160, y: 48 } },
        strokeStyle: "#0000ff",
        lineWidth: 2
      }),
      expect.objectContaining({
        id: "inside-long#48-76",
        line: { from: { x: 160, y: 48 }, to: { x: 160, y: 76 } },
        strokeStyle: "#00ff00",
        lineWidth: 1
      })
    ]);
  });
});

/**
 * Creates a minimal cell fragment for border resolver fixtures.
 *
 * @param id - Cell fragment id.
 * @param gridRect - Semantic grid rectangle.
 * @param rect - Physical cell rectangle.
 * @returns Cell fragment for border tests.
 */
function createCell(
  id: string,
  gridRect: QuireTableGeometrySnapshot["cells"][number]["gridRect"],
  rect: QuireTableGeometrySnapshot["cells"][number]["rect"]
): QuireTableGeometrySnapshot["cells"][number] {
  return {
    id,
    semanticCellId: `semantic:${id}`,
    originExplicitCellId: `explicit:${id}`,
    explicitCellIds: [`explicit:${id}`],
    originCellPos: 2,
    range: { from: 2, to: 6 },
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    gridRect,
    rect,
    contentRect: rect
  };
}

/**
 * Checks whether a vertical segment overlaps the inspected y range.
 *
 * @param segments - Resolved border segments.
 * @param x - X coordinate of the vertical edge.
 * @param fromY - Start of the inspected y range.
 * @param toY - End of the inspected y range.
 * @returns True when a vertical segment crosses the inspected range.
 */
function hasVerticalSegmentCrossing(
  segments: ReturnType<typeof resolveQuireTableBorderSegments>,
  x: number,
  fromY: number,
  toY: number
): boolean {
  return segments.some((segment) =>
    segment.line.from.x === x &&
    segment.line.to.x === x &&
    Math.min(segment.line.from.y, segment.line.to.y) < toY &&
    Math.max(segment.line.from.y, segment.line.to.y) > fromY
  );
}

/**
 * Checks whether a horizontal segment overlaps the inspected x range.
 *
 * @param segments - Resolved border segments.
 * @param y - Y coordinate of the horizontal edge.
 * @param fromX - Start of the inspected x range.
 * @param toX - End of the inspected x range.
 * @returns True when a horizontal segment crosses the inspected range.
 */
function hasHorizontalSegmentCrossing(
  segments: ReturnType<typeof resolveQuireTableBorderSegments>,
  y: number,
  fromX: number,
  toX: number
): boolean {
  return segments.some((segment) =>
    segment.line.from.y === y &&
    segment.line.to.y === y &&
    Math.min(segment.line.from.x, segment.line.to.x) < toX &&
    Math.max(segment.line.from.x, segment.line.to.x) > fromX
  );
}

/**
 * Creates a border candidate sharing the same test edge.
 *
 * @param id - Candidate id used as the resolved paint identity.
 * @param border - Normalized border value attached to the candidate.
 * @param priority - Source priority used as the tie-breaker.
 * @param line - Physical line represented by the candidate.
 * @returns Table border candidate for resolver tests.
 */
function createCandidate(
  id: string,
  border: QuireTableBorderCandidate["border"],
  priority: number,
  line: QuireTableBorderCandidate["line"] = {
    from: { x: 10, y: 20 },
    to: { x: 310, y: 20 }
  }
): QuireTableBorderCandidate {
  return {
    id,
    edge: "bottom",
    border,
    source: "cell",
    priority,
    ownerId: `${id}-owner`,
    line
  };
}
