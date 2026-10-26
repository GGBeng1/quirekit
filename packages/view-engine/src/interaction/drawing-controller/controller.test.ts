import { describe, expect, it } from "vitest";
import {
  createQuireDrawingControllerState,
  reduceQuireDrawingController
} from "./controller";
import { createQuireDrawingManipulationTrack } from "./geometry";
import type {
  QuireDrawingControllerIdentity,
  QuireDrawingControllerState,
  QuireDrawingResizeHandle
} from "./types";

const identity = {
  objectId: "object:1",
  drawingId: "drawing:1",
  rootId: "root:body",
  regionId: "region:body",
  visualInstanceId: "visual:page-1",
  sourceRevision: 4
} satisfies QuireDrawingControllerIdentity;

const frame = {
  rect: { x: 100, y: 80, width: 120, height: 60 },
  rotation: 0
} as const;

describe("drawing controller", () => {
  it.each([[120, 80, false], [120, 20, true], [10, 80, true], [10, 20, false]] as const)(
    "retains the line direction when dragging to %s,%s", (x, y, flipVertical) => {
      const started = reduceQuireDrawingController(createQuireDrawingControllerState(), {
        kind: "begin-create", identity, drawingKind: "shape", geometry: { kind: "preset", preset: "line" },
        pointerId: 5, point: { x: 50, y: 50 }, clientPoint: { x: 50, y: 50 }, defaultExtent: { width: 160, height: 1 }
      });
      const ended = reduceQuireDrawingController(started.state, { kind: "pointer-end", identity,
        pointerId: 5, point: { x, y }, clientPoint: { x, y } });
      expect(ended.commit).toMatchObject({ kind: "create", geometry: { kind: "preset", preset: "line" }, flipVertical });
    }
  );
  it("separates object selection from drawing-text editing and unwinds Escape", () => {
    const selected = reduceQuireDrawingController(
      createQuireDrawingControllerState(),
      { kind: "select-object", identity, frame }
    );
    const editing = reduceQuireDrawingController(selected.state, {
      kind: "enter-text",
      identity,
      storyId: "story:text-box"
    });
    const escaped = reduceQuireDrawingController(editing.state, { kind: "escape" });

    expect(selected.state.kind).toBe("object-selected");
    expect(editing.state).toEqual(expect.objectContaining({
      kind: "text-editing",
      storyId: "story:text-box"
    }));
    expect(escaped.state).toEqual(selected.state);
    expect(escaped.commit).toBeNull();
  });

  it("keeps movement below threshold as selection and commits once after drag end", () => {
    const started = startManipulation("move");
    const belowThreshold = reduceQuireDrawingController(started, {
      kind: "pointer-update",
      identity,
      pointerId: 9,
      clientPoint: { x: 13, y: 13 },
      point: { x: 103, y: 83 }
    });
    const moving = reduceQuireDrawingController(belowThreshold.state, {
      kind: "pointer-update",
      identity,
      pointerId: 9,
      clientPoint: { x: 20, y: 18 },
      point: { x: 125, y: 100 }
    });
    const ended = reduceQuireDrawingController(moving.state, {
      kind: "pointer-end",
      identity,
      pointerId: 9,
      clientPoint: { x: 22, y: 20 },
      point: { x: 130, y: 102 }
    });

    expect(belowThreshold.state.kind).toBe("pre-move");
    expect(belowThreshold.commit).toBeNull();
    expect(moving.state).toEqual(expect.objectContaining({
      kind: "moving",
      track: expect.objectContaining({
        previewFrame: {
          rect: { x: 125, y: 100, width: 120, height: 60 },
          rotation: 0
        }
      })
    }));
    expect(moving.commit).toBeNull();
    expect(ended.state).toEqual(expect.objectContaining({
      kind: "object-selected",
      frame: {
        rect: { x: 130, y: 102, width: 120, height: 60 },
        rotation: 0
      }
    }));
    expect(ended.commit).toEqual(expect.objectContaining({
      kind: "move",
      identity,
      frame: ended.state.kind === "object-selected" ? ended.state.frame : null
    }));
  });

  it("cancels a transient move without a commit", () => {
    const moving = reduceQuireDrawingController(startManipulation("move"), {
      kind: "pointer-update",
      identity,
      pointerId: 9,
      clientPoint: { x: 20, y: 20 },
      point: { x: 140, y: 110 }
    });
    const cancelled = reduceQuireDrawingController(moving.state, {
      kind: "pointer-cancel",
      identity,
      pointerId: 9
    });

    expect(cancelled.state).toEqual({ kind: "object-selected", identity, frame });
    expect(cancelled.commit).toBeNull();
  });

  it("anchors the opposite resize edge and enforces the minimum extent", () => {
    const resizing = startManipulation("resize", "north-west");
    const ended = reduceQuireDrawingController(resizing, {
      kind: "pointer-end",
      identity,
      pointerId: 9,
      clientPoint: { x: 200, y: 120 },
      point: { x: 260, y: 150 }
    }, { minimumExtent: { width: 24, height: 18 } });

    expect(ended.state).toEqual(expect.objectContaining({
      kind: "object-selected",
      frame: {
        rect: { x: 196, y: 122, width: 24, height: 18 },
        rotation: 0
      }
    }));
    expect(ended.commit?.kind).toBe("resize");
  });

  it.each([
    ["north-west", { right: 220, bottom: 140 }],
    ["north", { left: 100, right: 220, bottom: 140 }],
    ["north-east", { left: 100, bottom: 140 }],
    ["east", { left: 100, top: 80, bottom: 140 }],
    ["south-east", { left: 100, top: 80 }],
    ["south", { left: 100, right: 220, top: 80 }],
    ["south-west", { right: 220, top: 80 }],
    ["west", { right: 220, top: 80, bottom: 140 }]
  ] satisfies ReadonlyArray<readonly [
    QuireDrawingResizeHandle,
    Readonly<Record<string, number>>
  ]>)("keeps the opposite edges stable for the %s resize handle", (handle, expected) => {
    const start = startManipulation("resize", handle);
    const startPoint = handle === "south-east" ? { x: 220, y: 140 } : { x: 100, y: 80 };
    const resized = reduceQuireDrawingController(start, {
      kind: "pointer-update",
      identity,
      pointerId: 9,
      clientPoint: { x: 30, y: 30 },
      point: { x: startPoint.x + 12, y: startPoint.y + 10 }
    });

    expect(resized.state.kind).toBe("resizing");
    if (resized.state.kind !== "resizing") return;
    const rect = resized.state.track.previewFrame.rect;
    expect({
      left: rect.x,
      right: rect.x + rect.width,
      top: rect.y,
      bottom: rect.y + rect.height
    }).toEqual(expect.objectContaining(expected));
  });

  it("preserves aspect ratio for corner resize previews", () => {
    const resizing = reduceQuireDrawingController(
      startManipulation("resize", "south-east", true),
      {
        kind: "pointer-update",
        identity,
        pointerId: 9,
        clientPoint: { x: 40, y: 40 },
        point: { x: 260, y: 140 }
      }
    );

    expect(resizing.state).toEqual(expect.objectContaining({
      kind: "resizing",
      track: expect.objectContaining({
        previewFrame: {
          rect: { x: 100, y: 80, width: 160, height: 80 },
          rotation: 0
        }
      })
    }));
  });

  it("resizes a rotated frame on local axes while fixing the opposite corner", () => {
    const track = createQuireDrawingManipulationTrack(
      "resize",
      { ...frame, rotation: 90 },
      { x: 130, y: 170 },
      { x: 120, y: 210 },
      "south-east",
      false,
      {}
    );

    expect(track.previewFrame).toEqual({
      rect: { x: 75, y: 95, width: 160, height: 70 },
      rotation: 90
    });
  });

  it("preserves a rotated frame ratio and its opposite local corner", () => {
    const track = createQuireDrawingManipulationTrack(
      "resize",
      { ...frame, rotation: 90 },
      { x: 130, y: 170 },
      { x: 120, y: 210 },
      "south-east",
      true,
      {}
    );

    expect(track.previewFrame).toEqual({
      rect: { x: 70, y: 90, width: 160, height: 80 },
      rotation: 90
    });
  });

  it("normalizes direct rotation around the accepted frame center", () => {
    const rotating = reduceQuireDrawingController(
      startManipulation("rotate"),
      {
        kind: "pointer-update",
        identity,
        pointerId: 9,
        clientPoint: { x: 30, y: 30 },
        point: { x: 160, y: 170 }
      }
    );

    expect(rotating.state).toEqual(expect.objectContaining({
      kind: "rotating",
      track: expect.objectContaining({
        previewFrame: {
          rect: frame.rect,
          rotation: 180
        }
      })
    }));
  });

  it("rejects a stale visual instance and clears the preview", () => {
    const rejected = reduceQuireDrawingController(startManipulation("move"), {
      kind: "pointer-update",
      identity: { ...identity, visualInstanceId: "visual:page-2" },
      pointerId: 9,
      clientPoint: { x: 20, y: 20 },
      point: { x: 140, y: 110 }
    });

    expect(rejected).toEqual({
      state: { kind: "idle" },
      commit: null,
      rejection: "stale-identity"
    });
  });

  it("rejects changed source identity or revision and clears the preview", () => {
    for (const staleIdentity of [
      { ...identity, objectId: "object:2" },
      { ...identity, sourceRevision: 5 }
    ]) {
      const rejected = reduceQuireDrawingController(startManipulation("move"), {
        kind: "pointer-update",
        identity: staleIdentity,
        pointerId: 9,
        clientPoint: { x: 20, y: 20 },
        point: { x: 140, y: 110 }
      });
      expect(rejected.rejection).toBe("stale-identity");
      expect(rejected.state).toEqual({ kind: "idle" });
      expect(rejected.commit).toBeNull();
    }
  });

  it("rejects a mismatched pointer without discarding the accepted selection", () => {
    const started = startManipulation("move");
    const rejected = reduceQuireDrawingController(started, {
      kind: "pointer-update",
      identity,
      pointerId: 10,
      clientPoint: { x: 20, y: 20 },
      point: { x: 140, y: 110 }
    });

    expect(rejected).toEqual({
      state: started,
      commit: null,
      rejection: "pointer-mismatch"
    });
  });

  it("creates a default click frame or a normalized drag frame", () => {
    const creating = reduceQuireDrawingController(
      createQuireDrawingControllerState(),
      {
        kind: "begin-create",
        identity,
        drawingKind: "horizontal-text-box",
        pointerId: 12,
        clientPoint: { x: 10, y: 10 },
        point: { x: 50, y: 40 },
        defaultExtent: { width: 120, height: 60 }
      }
    );
    const clicked = reduceQuireDrawingController(creating.state, {
      kind: "pointer-end",
      identity,
      pointerId: 12,
      clientPoint: { x: 12, y: 11 },
      point: { x: 52, y: 41 }
    });
    const dragged = reduceQuireDrawingController(creating.state, {
      kind: "pointer-end",
      identity,
      pointerId: 12,
      clientPoint: { x: 50, y: 60 },
      point: { x: 20, y: 100 }
    });

    expect(clicked.commit).toEqual(expect.objectContaining({
      kind: "create",
      frame: {
        rect: { x: 50, y: 40, width: 120, height: 60 },
        rotation: 0
      }
    }));
    expect(dragged.commit).toEqual(expect.objectContaining({
      kind: "create",
      frame: {
        rect: { x: 20, y: 40, width: 30, height: 60 },
        rotation: 0
      }
    }));
  });
});

/**
 * Creates one pre-manipulation state from the canonical selected fixture.
 *
 * @param operation - Manipulation family to begin.
 * @param handle - Optional resize handle.
 * @param lockAspectRatio - Whether resize should preserve the fixture ratio.
 * @returns Controller state after the pointer start event.
 */
function startManipulation(
  operation: "move" | "resize" | "rotate",
  handle?: QuireDrawingResizeHandle,
  lockAspectRatio = false
): QuireDrawingControllerState {
  const selected = reduceQuireDrawingController(
    createQuireDrawingControllerState(),
    { kind: "select-object", identity, frame }
  ).state;
  return reduceQuireDrawingController(selected, {
    kind: "begin-manipulation",
    operation,
    handle,
    identity,
    pointerId: 9,
    clientPoint: { x: 10, y: 10 },
    point: operation === "rotate"
      ? { x: 160, y: 50 }
      : handle === "south-east"
        ? { x: 220, y: 140 }
        : { x: 100, y: 80 },
    lockAspectRatio
  }).state;
}
