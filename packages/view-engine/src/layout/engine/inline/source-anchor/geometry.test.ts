import { describe, expect, it } from "vitest";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type { QuireLayoutBox } from "../../types";
import { createQuireTestSubLayoutProjection } from "../../../../../test-support/layout/sub-layout-projection";
import { collectQuireInlineSourceLayoutAnchors } from "./geometry";

const owner: QuireLayoutOwnerFacts = {
  region: {
    rootId: { value: "root:body" },
    regionId: { value: "region:body" },
    kind: "body"
  },
  source: {
    sourceId: "doc:body",
    range: { from: 0, to: 30 }
  },
  capabilities: {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  }
};

describe("inline source anchor geometry", () => {
  it("resolves source geometry from the shared text caret topology", () => {
    const box: QuireLayoutBox = {
      id: "paragraph-attachment",
      range: { from: 9, to: 23 },
      rect: { x: 100, y: 40, width: 300, height: 24 },
      sourceAnchors: [{
        id: "paragraph-attachment:inline-source:6:attachment",
        nodeType: "attachment",
        range: { from: 16, to: 17 },
        position: { pos: 16, bias: 1 },
        affinity: "before"
      }],
      textFragments: [{
        id: "paragraph-attachment:before",
        text: "before",
        range: { from: 10, to: 16 },
        rect: { x: 108, y: 44, width: 60, height: 16 },
        font: "16px sans-serif",
        lineHeight: 18,
        baseline: 57,
        runAscent: 11,
        runDescent: 4,
        caretStops: [
          { position: { pos: 10, bias: 1 }, localX: 0 },
          { position: { pos: 16, bias: -1 }, localX: 60 }
        ]
      }]
    };

    expect(collectQuireInlineSourceLayoutAnchors(box, owner)).toEqual([{
      id: "paragraph-attachment:inline-source:6:attachment",
      sourceAnchorId: "paragraph-attachment:inline-source:6:attachment",
      kind: "inline-source",
      nodeType: "attachment",
      range: { from: 16, to: 17 },
      position: { pos: 16, bias: 1 },
      affinity: "before",
      occurrence: { kind: "single" },
      rect: { x: 168, y: 46, width: 0, height: 15 },
      placementReferences: {
        anchor: { x: 168, y: 46, width: 0, height: 15 },
        line: { x: 108, y: 44, width: 60, height: 16 },
        paragraph: { x: 100, y: 40, width: 300, height: 24 },
        containingRegion: { x: 100, y: 40, width: 300, height: 24 }
      },
      owner
    }]);
  });

  it("prefers an inline replacement fragment over the preceding boundary", () => {
    const box: QuireLayoutBox = {
      id: "paragraph-picture",
      range: { from: 9, to: 24 },
      rect: { x: 100, y: 40, width: 300, height: 110 },
      sourceAnchors: [{
        id: "paragraph-picture:inline-source:6:picture",
        nodeType: "picture",
        range: { from: 16, to: 17 },
        position: { pos: 16, bias: 1 },
        affinity: "before"
      }],
      textFragments: [{
        id: "paragraph-picture:before",
        text: "before",
        range: { from: 10, to: 16 },
        rect: { x: 108, y: 44, width: 60, height: 16 },
        font: "16px sans-serif",
        lineHeight: 18,
        baseline: 57,
        runAscent: 11,
        runDescent: 4,
        caretStops: [
          { position: { pos: 10, bias: 1 }, localX: 0 },
          { position: { pos: 16, bias: -1 }, localX: 60 }
        ]
      }, {
        id: "paragraph-picture:replacement",
        text: "",
        range: { from: 16, to: 17 },
        rect: { x: 100, y: 70, width: 120, height: 80 },
        font: "16px sans-serif",
        lineHeight: 80,
        baseline: 150,
        runAscent: 80,
        runDescent: 0,
        caretStops: [
          { position: { pos: 16, bias: 1 }, localX: 0 },
          { position: { pos: 17, bias: -1 }, localX: 120 }
        ]
      }]
    };

    expect(collectQuireInlineSourceLayoutAnchors(box, owner)[0]).toMatchObject({
      rect: { x: 100, y: 70, width: 0, height: 80 },
      placementReferences: {
        anchor: { x: 100, y: 70, width: 0, height: 80 },
        line: { x: 100, y: 70, width: 120, height: 80 }
      }
    });
  });

  it("keeps unresolved source identity when no text fragment surrounds the atom", () => {
    const box: QuireLayoutBox = {
      id: "atom-only",
      range: { from: 4, to: 7 },
      rect: { x: 24, y: 80, width: 180, height: 28 },
      sourceAnchors: [{
        id: "atom-only:inline-source:0:attachment",
        nodeType: "attachment",
        range: { from: 5, to: 6 },
        position: { pos: 5, bias: 1 },
        affinity: "before"
      }]
    };

    expect(collectQuireInlineSourceLayoutAnchors(box, owner)[0]).toMatchObject({
      id: "atom-only:inline-source:0:attachment",
      rect: { x: 24, y: 80, width: 0, height: 28 }
    });
  });

  it("rejects nested inline sources without exact sub-layout owner facts", () => {
    const sourceBox: QuireLayoutBox = {
      id: "nested-atom",
      range: { from: 5, to: 8 },
      rect: { x: 20, y: 30, width: 80, height: 24 },
      sourceAnchors: [{
        id: "nested-atom:inline-source:0:attachment",
        nodeType: "attachment",
        range: { from: 6, to: 7 },
        position: { pos: 6, bias: 1 },
        affinity: "before"
      }]
    };
    const container: QuireLayoutBox = {
      id: "nested-container",
      range: { from: 4, to: 9 },
      rect: { x: 10, y: 20, width: 100, height: 40 },
      subLayoutFragments: [{
        subLayout: createQuireTestSubLayoutProjection({
          root: {
            id: "nested-root",
            kind: "extension-container",
            range: { from: 4, to: 9 },
            placement: {
              parentId: "provider-root",
              rect: { x: 10, y: 20, width: 100, height: 40 },
              contentRect: { x: 20, y: 30, width: 80, height: 24 }
            },
            localRect: { x: 0, y: 0, width: 80, height: 24 },
            writingMode: "horizontal-tb",
            dependencySignature: "nested:v1"
          },
          resultId: "nested-fragment",
          acceptedBand: { top: 0, bottom: 24 },
          fragments: [{
            id: sourceBox.id,
            sourceId: sourceBox.id,
            range: sourceBox.range,
            rect: sourceBox.rect,
            localRect: { x: 0, y: 0, width: 80, height: 24 }
          }],
          fragmentSources: [{ fragmentId: sourceBox.id, sourceBox }],
          localToResult: { x: 20, y: 30 },
          contentClip: { x: 20, y: 30, width: 80, height: 24 },
          interactionClip: { x: 20, y: 30, width: 80, height: 24 },
          dependencySignature: "nested:v1"
        })
      }]
    };

    expect(() => collectQuireInlineSourceLayoutAnchors(container, owner))
      .toThrowError(/contains inline sources without exact owner facts/u);
  });
});
