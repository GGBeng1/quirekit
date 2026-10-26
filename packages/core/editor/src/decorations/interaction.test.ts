import { describe, expect, it } from "vitest";
import { readQuireDecorationInteractions } from "./interaction";

describe("typed decoration interactions", () => {
  it("retains complete range, inline-start, and point descriptors in source order", () => {
    const interactions = readQuireDecorationInteractions({
      quireInteractions: [{
        id: "body",
        placement: { kind: "range" },
        role: "date",
        part: "control-body",
        owner: { kind: "content-control", id: "date-1" },
        cursor: "pointer",
        handler: { id: "content-control.activate" }
      }, {
        id: "owner-handle",
        placement: { kind: "inline-start", width: 9, gap: 1 },
        role: "content-control",
        part: "owner-handle",
        owner: { kind: "content-control", id: "date-1" },
        cursor: "pointer"
      }, {
        id: "point-comment",
        placement: {
          kind: "point",
          alignment: "visual-line-end",
          width: 18,
          height: 18,
          gap: 2
        },
        role: "comment",
        part: "point-anchor",
        owner: { kind: "comment", id: "8" },
        cursor: "pointer",
        handler: { id: "quirekit.wordComment.activate" }
      }]
    });

    expect(interactions.map((interaction) => interaction.id)).toEqual([
      "body",
      "owner-handle",
      "point-comment"
    ]);
  });

  it("drops malformed descriptors instead of exposing partial targets", () => {
    expect(readQuireDecorationInteractions({
      quireInteractions: [{
        id: "",
        placement: { kind: "inline-start", width: -1, gap: 1 },
        role: "date",
        part: "control-body",
        owner: { kind: "content-control", id: "date-1" }
      }, null]
    })).toEqual([]);
    expect(readQuireDecorationInteractions(null)).toEqual([]);
    expect(readQuireDecorationInteractions({
      quireInteractions: [{
        id: "bad-point",
        placement: { kind: "point", width: 18, height: 0, gap: -1 },
        role: "comment",
        part: "point-anchor",
        owner: { kind: "comment", id: "8" }
      }]
    })).toEqual([]);
    expect(readQuireDecorationInteractions({
      quireInteractions: [{
        id: "bad-point-alignment",
        placement: {
          kind: "point",
          alignment: "paragraph-end",
          width: 18,
          height: 18,
          gap: 2
        },
        role: "comment",
        part: "point-anchor",
        owner: { kind: "comment", id: "8" }
      }]
    })).toEqual([]);
  });
});
