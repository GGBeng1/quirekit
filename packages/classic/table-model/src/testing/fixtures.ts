import type { QuireJSONContent } from "@quirekit/core";

/** JSON fixture used to validate Word table schema acceptance and round trips. */
export interface WordTableSchemaFixture {
  /** Stable fixture id used by docs and tests. */
  readonly name: string;
  /** Human-readable reason this fixture exists. */
  readonly description: string;
  /** Input JSON content parsed by a schema containing Word table nodes. */
  readonly input: QuireJSONContent;
}

const paragraph = {
  type: "paragraph"
} satisfies QuireJSONContent;

/** Schema fixture catalog for Word-compatible table nodes. */
export const wordTableSchemaFixtures: readonly WordTableSchemaFixture[] = [
  {
    name: "word-table-schema-minimal",
    description: "A one-cell Word table with only default table attributes.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          content: [
            {
              type: "wordTableRow",
              content: [
                {
                  type: "wordTableCell",
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "word-table-schema-typed-table-attrs",
    description: "A table carrying typed Word width, layout, look, grid, and style attrs.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          attrs: {
            tableStyle: "TableGrid",
            width: { value: 9360, unit: "dxa" },
            alignment: "center",
            tableLayout: "fixed",
            tableLook: {
              firstRow: true,
              lastRow: false,
              firstColumn: true,
              lastColumn: false,
              bandedRows: true,
              bandedColumns: false,
              rawValue: "04A0"
            },
            grid: [
              { width: { value: 3120, unit: "dxa" } },
              { width: { value: 3120, unit: "dxa" } },
              { width: { value: 3120, unit: "dxa" } }
            ],
            borders: {
              top: { style: "single", size: 4, color: "auto", space: 0 },
              right: { style: "single", size: 4, color: "auto", space: 0 },
              bottom: { style: "single", size: 4, color: "auto", space: 0 },
              left: { style: "single", size: 4, color: "auto", space: 0 },
              insideH: { style: "single", size: 4, color: "auto", space: 0 },
              insideV: { style: "single", size: 4, color: "auto", space: 0 }
            }
          },
          content: [
            {
              type: "wordTableRow",
              content: [
                {
                  type: "wordTableCell",
                  attrs: { width: { value: 3120, unit: "dxa" } },
                  content: [paragraph]
                },
                {
                  type: "wordTableCell",
                  attrs: { width: { value: 3120, unit: "dxa" } },
                  content: [paragraph]
                },
                {
                  type: "wordTableCell",
                  attrs: { width: { value: 3120, unit: "dxa" } },
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "word-table-schema-row-header-and-cant-split",
    description: "A repeating header row that also asks pagination not to split it.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          content: [
            {
              type: "wordTableRow",
              attrs: {
                isHeader: true,
                cantSplit: true,
                height: { value: 360, rule: "atLeast" },
                borders: {
                  top: null,
                  right: null,
                  bottom: { style: "single", size: 12, color: "0000ff", space: 0 },
                  left: null,
                  insideH: null,
                  insideV: null
                }
              },
              content: [
                {
                  type: "wordTableCell",
                  attrs: {
                    shading: { fill: "D9EAF7", color: null, pattern: "clear" }
                  },
                  content: [paragraph]
                },
                {
                  type: "wordTableCell",
                  content: [paragraph]
                }
              ]
            },
            {
              type: "wordTableRow",
              content: [
                {
                  type: "wordTableCell",
                  content: [paragraph]
                },
                {
                  type: "wordTableCell",
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "word-table-schema-grid-offsets",
    description: "Rows may omit grid columns before and after explicit cells.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          attrs: {
            grid: [
              { width: { value: 1800, unit: "dxa" } },
              { width: { value: 1800, unit: "dxa" } },
              { width: { value: 1800, unit: "dxa" } }
            ]
          },
          content: [
            {
              type: "wordTableRow",
              attrs: {
                gridBefore: 1,
                gridAfter: 1
              },
              content: [
                {
                  type: "wordTableCell",
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "word-table-schema-vmerge-continuation-cell",
    description: "Vertical merge restart and continuation cells remain explicit nodes.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          content: [
            {
              type: "wordTableRow",
              content: [
                {
                  type: "wordTableCell",
                  attrs: {
                    rowspan: 2,
                    vMerge: "restart",
                    vMergePreservation: {
                      chainId: "vm-1",
                      restartRow: 0,
                      restartColumn: 0
                    }
                  },
                  content: [paragraph]
                },
                {
                  type: "wordTableCell",
                  content: [paragraph]
                }
              ]
            },
            {
              type: "wordTableRow",
              content: [
                {
                  type: "wordTableCell",
                  attrs: {
                    vMerge: "continue",
                    vMergePreservation: {
                      chainId: "vm-1",
                      restartRow: 0,
                      restartColumn: 0
                    }
                  },
                  content: [paragraph]
                },
                {
                  type: "wordTableCell",
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "word-table-schema-single-cell-node-type-for-header-row",
    description: "Header rows use the same cell node type as body rows.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          content: [
            {
              type: "wordTableRow",
              attrs: {
                isHeader: true,
                borders: {
                  top: null,
                  right: null,
                  bottom: { style: "single", size: 12, color: "0000ff", space: 0 },
                  left: null,
                  insideH: null,
                  insideV: null
                }
              },
              content: [
                {
                  type: "wordTableCell",
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "word-table-schema-preservation-raw",
    description: "Unknown source values are retained under preservation attrs.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          attrs: {
            preservation: {
              source: "ooxml",
              rawAttributes: {
                "w:tblOverlap": "never",
                "w:jc": "start"
              },
              rawChildren: [
                { name: "w:tblPrEx", attrs: { "w:val": "legacy" } }
              ],
              notes: ["retained unknown table property"]
            }
          },
          content: [
            {
              type: "wordTableRow",
              attrs: {
                preservation: {
                  source: "litast",
                  rawAttributes: { rowId: "r-1" }
                }
              },
              content: [
                {
                  type: "wordTableCell",
                  attrs: {
                    preservation: {
                      source: "ooxml",
                      rawAttributes: { "w:tcFitText": "1" }
                    }
                  },
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: "word-table-schema-diagnostics-do-not-reject",
    description: "Schema accepts inconsistent spans so the table map can diagnose them.",
    input: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          attrs: {
            grid: [
              { width: { value: 2400, unit: "dxa" } },
              { width: { value: 2400, unit: "dxa" } }
            ]
          },
          content: [
            {
              type: "wordTableRow",
              content: [
                {
                  type: "wordTableCell",
                  attrs: {
                    colspan: 2,
                    gridSpan: 3,
                    vMerge: "continue"
                  },
                  content: [paragraph]
                }
              ]
            }
          ]
        }
      ]
    }
  }
];
