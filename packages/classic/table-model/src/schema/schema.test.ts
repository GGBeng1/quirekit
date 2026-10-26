import { Editor, Node, type QuireJSONContent } from "@quirekit/core";
import { Schema, type Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import {
  type WordTableSchemaFixture,
  wordTableSchemaFixtures
} from "../testing/fixtures";
import { WordTableExtensions, wordTableNodeSpecs } from "./nodes";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    ...wordTableNodeSpecs
  }
});

/**
 * Collects descendant nodes matching a ProseMirror node type name.
 *
 * @param node - Root node to scan.
 * @param typeName - ProseMirror node type name to collect.
 * @returns Descendant nodes that match the requested type.
 */
function collectNodes(node: PMNode, typeName: string): PMNode[] {
  const nodes: PMNode[] = [];

  node.descendants((child) => {
    if (child.type.name === typeName) {
      nodes.push(child);
    }
  });

  return nodes;
}

/**
 * Gets a fixture by stable fixture id.
 *
 * @param name - Fixture id.
 * @returns Matching fixture.
 */
function getFixture(name: string): WordTableSchemaFixture {
  const fixture = wordTableSchemaFixtures.find((item) => item.name === name);

  if (!fixture) {
    throw new Error(`Missing Word table schema fixture: ${name}`);
  }

  return fixture;
}

/**
 * Parses a fixture into the Word table test schema.
 *
 * @param fixture - Fixture to parse.
 * @returns Parsed ProseMirror document.
 */
function parseFixture(fixture: WordTableSchemaFixture): PMNode {
  return schema.nodeFromJSON(fixture.input);
}

describe("Word table schema", () => {
  it("isolates contributed table roles from ordinary document nodes", () => {
    const editor = createSchemaEditor({ type: "doc", content: [{ type: "paragraph" }] });
    const nodes = editor.state.schema.nodes;
    expect(nodes.doc!.spec.tableRole).toBeUndefined();
    expect(nodes.paragraph!.spec.tableRole).toBeUndefined();
    expect(nodes.text!.spec.tableRole).toBeUndefined();
    expect(nodes.wordTable!.spec.tableRole).toBe("table");
    expect(nodes.wordTableRow!.spec.tableRole).toBe("row");
    expect(nodes.wordTableCell!.spec.tableRole).toBe("cell");
    editor.destroy();
  });
  it("marks table node specs with table roles", () => {
    expect(wordTableNodeSpecs.wordTable.tableRole).toBe("table");
    expect(wordTableNodeSpecs.wordTableRow.tableRole).toBe("row");
    expect(wordTableNodeSpecs.wordTableCell.tableRole).toBe("cell");
  });

  it.each(wordTableSchemaFixtures)(
    "round-trips normalized JSON for $name",
    (fixture) => {
      const document = parseFixture(fixture);
      const normalized = document.toJSON() as QuireJSONContent;
      const reparsed = schema.nodeFromJSON(normalized);

      expect(reparsed.toJSON()).toEqual(normalized);
    }
  );

  it("keeps typed table attrs available after parsing", () => {
    const document = parseFixture(
      getFixture("word-table-schema-typed-table-attrs")
    );
    const table = collectNodes(document, "wordTable")[0];

    expect(table).toBeDefined();
    expect(table?.attrs.tableStyle).toBe("TableGrid");
    expect(table?.attrs.width).toEqual({ value: 9360, unit: "dxa" });
    expect(table?.attrs.tableLayout).toBe("fixed");
    expect(table?.attrs.grid).toHaveLength(3);
  });

  it("keeps header rows as row attrs without changing the cell node type", () => {
    const document = parseFixture(
      getFixture("word-table-schema-single-cell-node-type-for-header-row")
    );
    const row = collectNodes(document, "wordTableRow")[0];
    const cells = collectNodes(document, "wordTableCell");

    expect(row?.attrs.isHeader).toBe(true);
    expect(row?.attrs.borders).toEqual(expect.objectContaining({
      bottom: { style: "single", size: 12, color: "0000ff", space: 0 }
    }));
    expect(cells).toHaveLength(1);
    expect(cells[0]?.type.name).toBe("wordTableCell");
  });

  it("keeps vertical merge continuation cells explicit", () => {
    const document = parseFixture(
      getFixture("word-table-schema-vmerge-continuation-cell")
    );
    const cells = collectNodes(document, "wordTableCell");

    expect(cells.map((cell) => cell.attrs.vMerge)).toEqual([
      "restart",
      null,
      "continue",
      null
    ]);
  });

  it("defaults PM helper spans while retaining Word grid spans separately", () => {
    const document = parseFixture(getFixture("word-table-schema-minimal"));
    const row = collectNodes(document, "wordTableRow")[0];
    const cell = collectNodes(document, "wordTableCell")[0];

    expect(row?.attrs.gridBefore).toBe(0);
    expect(row?.attrs.gridAfter).toBe(0);
    expect(cell?.attrs.colspan).toBe(1);
    expect(cell?.attrs.gridSpan).toBe(1);
    expect(cell?.attrs.rowspan).toBe(1);
  });

  it("renders native table spans and portable flow styles from schema semantics", () => {
    const editor = createSchemaEditor({
      type: "doc",
      content: [{
        type: "wordTable",
        attrs: {
          width: { value: 320, unit: "px" },
          alignment: "center",
          tableLayout: "fixed"
        },
        content: [{
          type: "wordTableRow",
          attrs: { gridBefore: 1, gridAfter: 2 },
          content: [{
            type: "wordTableCell",
            attrs: {
              colspan: 2,
              gridSpan: 2,
              rowspan: 3,
              backgroundColor: "dbeafe",
              noWrap: true,
              verticalAlign: "center"
            },
            content: [{ type: "paragraph" }]
          }]
        }]
      }]
    });
    const table = editor.state.doc.firstChild!;
    const row = table.firstChild!;
    const cell = row.firstChild!;

    expect(table.type.spec.toDOM?.(table)).toEqual([
      "table",
      {
        style: "border-collapse: collapse; width: 320px; margin-left: auto; margin-right: auto; table-layout: fixed"
      },
      ["tbody", 0]
    ]);
    expect(row.type.spec.toDOM?.(row)).toEqual(["tr", {}, 0]);
    expect(cell.type.spec.toDOM?.(cell)).toEqual([
      "td",
      {
        colspan: 2,
        rowspan: 3,
        style: "border: 1px solid #000000; padding: 4px 6px; background-color: #dbeafe; white-space: nowrap; vertical-align: middle"
      },
      0
    ]);
  });

  it("keeps explicit vertical-merge continuations out of native table flow", () => {
    const editor = createSchemaEditor({
      type: "doc",
      content: [{
        type: "wordTable",
        content: [{
          type: "wordTableRow",
          content: [{
            type: "wordTableCell",
            attrs: { vMerge: "continue" },
            content: [{ type: "paragraph" }]
          }]
        }]
      }]
    });
    const cell = editor.state.doc.firstChild!.firstChild!.firstChild!;

    expect(cell.type.spec.toDOM?.(cell)).toEqual([
      "td",
      {
        style: "border: 1px solid #000000; padding: 4px 6px; display: none; white-space: normal; vertical-align: top"
      },
      0
    ]);
  });

  it.each([
    { fill: "E5484D", legacy: "DBEAFE", expected: "#E5484D" },
    { fill: null, legacy: "DBEAFE", expected: "#DBEAFE" },
    { fill: "E5484D", legacy: null, expected: "#E5484D" }
  ])("projects direct shading without a named table style: $fill / $legacy", ({ fill, legacy, expected }) => {
    const editor = createSchemaEditor({ type: "doc", content: [{ type: "wordTable", content: [{
      type: "wordTableRow", content: [{ type: "wordTableCell", attrs: {
        shading: fill === null ? null : { fill, pattern: "clear", color: "auto" }, backgroundColor: legacy
      }, content: [{ type: "paragraph" }] }]
    }] }] });
    const cell = editor.state.doc.firstChild!.firstChild!.firstChild!;
    const before = editor.getJSON();
    expect(cell.type.spec.toDOM?.(cell)).toEqual(["td", {
      style: `border: 1px solid #000000; padding: 4px 6px; background-color: ${expected}; white-space: normal; vertical-align: top`
    }, 0]);
    expect(editor.getJSON()).toEqual(before);
    editor.destroy();
  });

  it.each([
    { noWrap: null, verticalAlign: null, whiteSpace: "normal", alignment: "top" },
    { noWrap: false, verticalAlign: "top", whiteSpace: "normal", alignment: "top" },
    { noWrap: true, verticalAlign: "center", whiteSpace: "nowrap", alignment: "middle" },
    { noWrap: false, verticalAlign: "bottom", whiteSpace: "normal", alignment: "bottom" }
  ])("projects cell flow defaults without materializing attrs: $noWrap / $verticalAlign", values => {
    const editor = createSchemaEditor({
      type: "doc",
      content: [{ type: "wordTable", content: [{ type: "wordTableRow", content: [{
        type: "wordTableCell",
        attrs: { noWrap: values.noWrap, verticalAlign: values.verticalAlign },
        content: [{ type: "paragraph" }]
      }] }] }]
    });
    const cell = editor.state.doc.firstChild!.firstChild!.firstChild!;
    const before = editor.getJSON();

    expect(cell.type.spec.toDOM?.(cell)).toEqual(["td", {
      style: `border: 1px solid #000000; padding: 4px 6px; white-space: ${values.whiteSpace}; vertical-align: ${values.alignment}`
    }, 0]);
    expect(editor.getJSON()).toEqual(before);
    expect(cell.attrs.noWrap).toBe(values.noWrap);
    expect(cell.attrs.verticalAlign).toBe(values.verticalAlign);
    editor.destroy();
  });
});

/**
 * Creates the minimal extension-backed editor schema used by HTML contract tests.
 *
 * @param content - Document JSON to parse.
 * @returns Editor whose generated schema includes extension renderHTML contracts.
 */
function createSchemaEditor(content: QuireJSONContent): Editor {
  return new Editor({
    extensions: [
      Node.create({ name: "doc", topNode: true, content: "block+" }),
      Node.create({
        name: "paragraph",
        group: "block",
        content: "inline*",
        renderHTML() {
          return ["p", 0];
        }
      }),
      Node.create({ name: "text", group: "inline" }),
      ...WordTableExtensions
    ],
    content
  });
}
