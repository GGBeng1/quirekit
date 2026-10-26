import type { QuireLayoutSnapshot } from "../../editor-layout";
import type { QuireLayoutCapabilitySet } from "@quirekit/layout/identity";
import { describe, expect, it } from "vitest";
import {
  resolveQuireInteractionNearestCaretAtPoint,
  resolveQuireInteractionPageBodyNearestCaret
} from ".";

const capabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} satisfies QuireLayoutCapabilitySet;

const page = {
  pageIndex: 0,
  range: { from: 0, to: 10 },
  pageRect: { x: 0, y: 0, width: 300, height: 140 },
  bodyRect: { x: 10, y: 20, width: 280, height: 80 }
};

const snapshot = {
  state: {} as QuireLayoutSnapshot["state"],
  documentRect: page.pageRect,
  viewportRect: page.pageRect,
  domOverlays: [],
  hitTargets: [],
  pages: [page],
  root: {
    id: "document",
    kind: "block",
    range: { from: 0, to: 20 },
    rect: page.pageRect,
    children: [
      {
        id: "body",
        kind: "block",
        range: { from: 0, to: 10 },
        rect: { x: 10, y: 20, width: 280, height: 40 },
        layoutOwner: {
          region: {
            rootId: { value: "body-root" },
            regionId: { value: "body-region" },
            kind: "body"
          },
          source: {
            sourceId: "doc:body",
            range: { from: 0, to: 10 }
          },
          capabilities
        },
        textFragments: [
          {
            id: "body:text",
            text: "Body",
            range: { from: 1, to: 5 },
            rect: { x: 10, y: 20, width: 40, height: 24 },
            font: "16px sans-serif",
            lineHeight: 24,
            baseline: 38,
            caretStops: [
              { position: { pos: 1, bias: 1 }, localX: 0 },
              { position: { pos: 5, bias: -1 }, localX: 40 }
            ]
          }
        ],
        children: []
      },
      {
        id: "footer",
        kind: "block",
        range: { from: 11, to: 17 },
        rect: { x: 10, y: 102, width: 280, height: 24 },
        layoutOwner: {
          region: {
            rootId: { value: "footer-root" },
            regionId: { value: "footer-region" },
            kind: "footer"
          },
          source: {
            sourceId: "section:footer",
            range: { from: 11, to: 17 }
          },
          capabilities
        },
        textFragments: [
          {
            id: "footer:text",
            text: "Footer",
            range: { from: 11, to: 17 },
            rect: { x: 10, y: 102, width: 60, height: 24 },
            font: "16px sans-serif",
            lineHeight: 24,
            baseline: 120,
            caretStops: [
              { position: { pos: 11, bias: 1 }, localX: 0 },
              { position: { pos: 17, bias: -1 }, localX: 60 }
            ]
          }
        ],
        children: []
      }
    ]
  }
} satisfies QuireLayoutSnapshot;

describe("page body interaction geometry", () => {
  it("excludes a geometrically closer footer from a page body caret query", () => {
    const point = { x: 25, y: 100 };

    expect(
      resolveQuireInteractionNearestCaretAtPoint({
        snapshot,
        point
      })
    ).toEqual(expect.objectContaining({
      kind: "caret",
      position: { pos: 11, bias: 1 }
    }));

    expect(
      resolveQuireInteractionPageBodyNearestCaret({
        snapshot,
        page,
        point,
        sourceId: "doc:body"
      })
    ).toEqual(expect.objectContaining({
      kind: "caret",
      position: { pos: 5, bias: -1 }
    }));
  });
});
