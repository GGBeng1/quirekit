import type { QuireDecorationLanes } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import { createQuireDecorationCursorTargets } from "./decoration-targets";

describe("decoration cursor targets", () => {
  it("retains typed targets even when no decoration visual is painted", () => {
    const target = {
      id: "decoration-interaction:date",
      nodePath: "decoration-interaction/date",
      rect: { x: 50, y: 30, width: 92, height: 18 },
      range: { from: 12, to: 22 },
      role: "date",
      part: "control-body",
      owner: { kind: "content-control", id: "date-1" },
      pointerEvents: "auto" as const,
      cursor: "pointer",
      events: {
        click: {
          handler: "quirekit.wordContentControl.specialized.activate",
          payload: { range: { from: 12, to: 22 } }
        }
      }
    };
    const lanes: QuireDecorationLanes = {
      interactionTargets: [target],
      backgrounds: [],
      textStyles: [],
      nodes: [],
      pointMarkers: [],
      widgets: [],
      diagnostics: []
    };

    expect(createQuireDecorationCursorTargets(lanes)).toEqual([target]);
  });

  it("places typed event handlers above passive cursor-only visuals", () => {
    const semanticTarget = {
      id: "decoration-interaction:checkbox",
      nodePath: "decoration-interaction/checkbox",
      rect: { x: 24, y: 30, width: 18, height: 18 },
      range: { from: 7, to: 8 },
      role: "checkbox",
      part: "control-body",
      owner: { kind: "content-control", id: "checkbox-1" },
      pointerEvents: "auto" as const,
      cursor: "pointer",
      events: { click: { handler: "word.checkbox.toggle" } }
    };
    const lanes: QuireDecorationLanes = {
      interactionTargets: [semanticTarget],
      backgrounds: [{
        id: "checkbox-cursor",
        decorationId: "checkbox",
        range: { from: 7, to: 8 },
        rect: semanticTarget.rect,
        attrs: {},
        cursor: "pointer"
      }],
      textStyles: [],
      nodes: [],
      pointMarkers: [],
      widgets: [],
      diagnostics: []
    };

    expect(createQuireDecorationCursorTargets(lanes).map((target) => target.id))
      .toEqual([
        "decoration-cursor:checkbox-cursor",
        "decoration-interaction:checkbox"
      ]);
  });

  it("projects cursor-bearing background visuals without semantic handlers", () => {
    const lanes: QuireDecorationLanes = {
      interactionTargets: [],
      backgrounds: [{
        id: "inline:1",
        decorationId: "decoration:1",
        range: { from: 2, to: 5 },
        rect: { x: 10, y: 20, width: 40, height: 18 },
        attrs: {},
        cursor: "pointer"
      }],
      textStyles: [],
      nodes: [],
      pointMarkers: [],
      widgets: [],
      diagnostics: []
    };

    expect(createQuireDecorationCursorTargets(lanes)).toEqual([{
      id: "decoration-cursor:inline:1",
      nodePath: "decoration-cursor/inline:1",
      rect: { x: 10, y: 20, width: 40, height: 18 },
      range: { from: 2, to: 5 },
      role: "document-decoration",
      part: "cursor",
      owner: { kind: "decoration", id: "decoration:1" },
      pointerEvents: "auto",
      cursor: "pointer",
      events: {}
    }]);
  });

  it("keeps a text-owner handle separate from its ordinary caret body", () => {
    const lanes: QuireDecorationLanes = {
      interactionTargets: [],
      backgrounds: [{
        id: "inline:rich-text:owner-handle",
        decorationId: "decoration:rich-text",
        range: { from: 12, to: 22 },
        rect: { x: 41, y: 30, width: 9, height: 18 },
        attrs: {
          "data-qk-decoration-control": "content-control",
          "data-qk-decoration-control-part": "owner-handle",
          "data-qk-decoration-owner-kind": "content-control",
          "data-qk-decoration-owner-id": "rich-1"
        },
        cursor: "pointer"
      }, {
        id: "inline:rich-text:body",
        decorationId: "decoration:rich-text",
        range: { from: 12, to: 22 },
        rect: { x: 50, y: 30, width: 92, height: 18 },
        attrs: {
          "data-qk-decoration-control": "richText",
          "data-qk-decoration-owner-kind": "content-control",
          "data-qk-decoration-owner-id": "rich-1"
        },
        cursor: "text"
      }],
      textStyles: [],
      nodes: [],
      pointMarkers: [],
      widgets: [],
      diagnostics: []
    };

    expect(createQuireDecorationCursorTargets(lanes)).toEqual([{
      id: "decoration-cursor:inline:rich-text:owner-handle",
      nodePath: "decoration-cursor/inline:rich-text:owner-handle",
      rect: { x: 41, y: 30, width: 9, height: 18 },
      range: { from: 12, to: 22 },
      role: "content-control",
      part: "owner-handle",
      owner: { kind: "content-control", id: "rich-1" },
      pointerEvents: "auto",
      cursor: "pointer",
      events: {}
    }, {
      id: "decoration-cursor:inline:rich-text:body",
      nodePath: "decoration-cursor/inline:rich-text:body",
      rect: { x: 50, y: 30, width: 92, height: 18 },
      range: { from: 12, to: 22 },
      role: "richText",
      part: "cursor",
      owner: { kind: "content-control", id: "rich-1" },
      pointerEvents: "auto",
      cursor: "text",
      events: {}
    }]);
    expect(lanes.backgrounds[0]!.rect.x + lanes.backgrounds[0]!.rect.width)
      .toBe(lanes.backgrounds[1]!.rect.x);
  });
});
