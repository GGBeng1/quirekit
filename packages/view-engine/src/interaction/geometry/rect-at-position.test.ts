import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../../layout";
import { resolveLayoutRectAtPos } from "./rect-at-position";

const continuationTableNodes: readonly QuireLayoutNode[] = [
  {
    id: "wordTable-0:layout",
    kind: "block",
    range: { from: 0, to: 40 },
    rect: { x: 10, y: 20, width: 300, height: 96 },
    children: [
      {
        id: "wordTable-0:continuation-shell",
        kind: "block",
        range: { from: 20, to: 30 },
        rect: { x: 10, y: 20, width: 150, height: 96 },
        children: []
      },
      {
        id: "wordTable-0:origin-content",
        kind: "block",
        range: { from: 2, to: 13 },
        rect: { x: 10, y: 20, width: 150, height: 96 },
        children: [
          {
            id: "wordTable-0:origin-paragraph",
            kind: "block",
            range: { from: 3, to: 12 },
            rect: { x: 15, y: 25, width: 140, height: 24 },
            textFragments: [
              {
                id: "wordTable-0:origin-text-0",
                text: "Row 2 A",
                range: { from: 4, to: 11 },
                rect: { x: 15, y: 25, width: 70, height: 24 },
                font: "16px sans-serif",
                lineHeight: 24,
                baseline: 43,
                caretStops: [
                  { position: { pos: 4, bias: 1 }, localX: 0 },
                  { position: { pos: 5, bias: 0 }, localX: 10 },
                  { position: { pos: 6, bias: 0 }, localX: 20 },
                  { position: { pos: 7, bias: 0 }, localX: 30 },
                  { position: { pos: 8, bias: 0 }, localX: 40 },
                  { position: { pos: 9, bias: 0 }, localX: 50 },
                  { position: { pos: 10, bias: 0 }, localX: 60 },
                  { position: { pos: 11, bias: -1 }, localX: 70 }
                ]
              }
            ],
            children: []
          }
        ]
      },
      {
        id: "wordTable-0:right-cell",
        kind: "block",
        range: { from: 30, to: 40 },
        rect: { x: 160, y: 20, width: 150, height: 96 },
        children: [
          {
            id: "wordTable-0:right-cell:paragraph",
            kind: "block",
            range: { from: 31, to: 39 },
            rect: { x: 165, y: 25, width: 140, height: 24 },
            textFragments: [
              {
                id: "wordTable-0:right-cell:text-0",
                text: "B side",
                range: { from: 32, to: 38 },
                rect: { x: 165, y: 25, width: 60, height: 24 },
                font: "16px sans-serif",
                lineHeight: 24,
                baseline: 43,
                caretStops: [
                  { position: { pos: 32, bias: 1 }, localX: 0 },
                  { position: { pos: 33, bias: 0 }, localX: 10 },
                  { position: { pos: 34, bias: 0 }, localX: 20 },
                  { position: { pos: 35, bias: 0 }, localX: 30 },
                  { position: { pos: 36, bias: 0 }, localX: 40 },
                  { position: { pos: 37, bias: 0 }, localX: 50 },
                  { position: { pos: 38, bias: -1 }, localX: 60 }
                ]
              }
            ],
            children: []
          }
        ]
      }
    ]
  }
];

describe("resolveLayoutRectAtPos", () => {
  it("uses the requested downstream side at a wrapped text boundary", () => {
    expect(resolveLayoutRectAtPos(wrappedBoundaryNodes, 4, 1)).toEqual({
      x: 10,
      y: 44,
      width: 1,
      height: 24
    });
  });

  it("uses the requested upstream side at a wrapped text boundary", () => {
    expect(resolveLayoutRectAtPos(wrappedBoundaryNodes, 4, -1)).toEqual({
      x: 40,
      y: 20,
      width: 1,
      height: 24
    });
  });

  it("maps continuation table cell shell positions to visible origin text", () => {
    expect(resolveLayoutRectAtPos(continuationTableNodes, 21, 1)).toEqual({
      x: 85,
      y: 25,
      width: 1,
      height: 24
    });
  });

  it("clips no-wrap table cell text positions to the visible cell content", () => {
    expect(resolveLayoutRectAtPos(clippedNoWrapCellNodes, 20, 1)).toEqual({
      x: 115,
      y: 25,
      width: 1,
      height: 24
    });
  });
});

const wrappedBoundaryNodes: readonly QuireLayoutNode[] = [
  {
    id: "paragraph-0",
    kind: "block",
    range: { from: 0, to: 8 },
    rect: { x: 10, y: 20, width: 30, height: 48 },
    textFragments: [
      {
        id: "paragraph-0:text-0",
        text: "abc",
        range: { from: 1, to: 4 },
        rect: { x: 10, y: 20, width: 30, height: 24 },
        font: "16px sans-serif",
        lineHeight: 24,
        baseline: 38,
        caretStops: [
          { position: { pos: 1, bias: 1 }, localX: 0 },
          { position: { pos: 2, bias: 0 }, localX: 10 },
          { position: { pos: 3, bias: 0 }, localX: 20 },
          { position: { pos: 4, bias: -1 }, localX: 30 }
        ]
      },
      {
        id: "paragraph-0:text-1",
        text: "def",
        range: { from: 4, to: 7 },
        rect: { x: 10, y: 44, width: 30, height: 24 },
        font: "16px sans-serif",
        lineHeight: 24,
        baseline: 62,
        caretStops: [
          { position: { pos: 4, bias: 1 }, localX: 0 },
          { position: { pos: 5, bias: 0 }, localX: 10 },
          { position: { pos: 6, bias: 0 }, localX: 20 },
          { position: { pos: 7, bias: -1 }, localX: 30 }
        ]
      }
    ],
    children: []
  }
];

const clippedNoWrapCellNodes: readonly QuireLayoutNode[] = [
  {
    id: "wordTable-0:layout",
    kind: "block",
    range: { from: 0, to: 30 },
    rect: { x: 10, y: 20, width: 120, height: 34 },
    children: [
      {
        id: "wordTable-0:cell-0-0",
        kind: "block",
        range: { from: 4, to: 28 },
        rect: { x: 15, y: 25, width: 100, height: 24 },
        textFragments: [
          {
            id: "wordTable-0:cell-0-0:text-0",
            text: "Visible text followed by hidden overflow",
            range: { from: 5, to: 25 },
            rect: { x: 15, y: 25, width: 200, height: 24 },
            font: "16px sans-serif",
            lineHeight: 24,
            baseline: 43,
            caretStops: [
              { position: { pos: 5, bias: 1 }, localX: 0 },
              { position: { pos: 15, bias: 0 }, localX: 100 },
              { position: { pos: 20, bias: 0 }, localX: 160 },
              { position: { pos: 25, bias: -1 }, localX: 200 }
            ]
          }
        ],
        children: []
      }
    ]
  }
];
