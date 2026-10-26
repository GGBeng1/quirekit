import { compileQuireViewNode } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { applyQuireObjectSelectionSurfaceConfig } from "../../../display-list";
import {
  createQuireDrawingSelectedObjectView,
  quireDrawingEnterTextHandlerId,
  quireDrawingManipulationHandlerId
} from "./selection";
import { transformQuireDrawingSelectionProducts } from "./transform";

describe("selected drawing manipulation products", () => {
  it("compiles shared captured actions for move, resize, and rotate controls", () => {
    const compiled = compileQuireViewNode({
      id: "selected-drawing",
      node: createQuireDrawingSelectedObjectView(160, 90, {
        objectId: "drawing-anchor",
        drawingId: "drawing-payload",
        lockAspectRatio: false,
        showRotationHandle: true
      }),
      origin: { x: 100, y: 200 },
      constraints: {
        minWidth: 160,
        maxWidth: 160,
        minHeight: 90,
        maxHeight: 90
      },
      layer: "overlay"
    });

    const eventful = compiled.targets.filter((target) =>
      Object.keys(target.events).length > 0
    );
    expect(eventful).toHaveLength(13);
    expect(eventful.filter((target) => target.part?.startsWith("move-")))
      .toHaveLength(4);
    expect(eventful.filter((target) => target.role === "resize-handle"))
      .toHaveLength(8);
    expect(eventful.filter((target) => target.role === "rotate-handle"))
      .toHaveLength(1);
    expect(eventful.filter((target) => target.captureCursor !== "none").map(
      (target) => ({ role: target.role, part: target.part })
    )).toEqual([]);

    for (const target of eventful) {
      for (const phase of [
        "pointerDown",
        "pointerMove",
        "pointerUp",
        "pointerCancel"
      ] as const) {
        expect(target.events[phase]).toMatchObject({
          handler: quireDrawingManipulationHandlerId,
          payload: {
            objectId: "drawing-anchor",
            drawingId: "drawing-payload",
            lockAspectRatio: false
          }
        });
      }
    }

    const resizeTargets = eventful.filter((target) =>
      target.role === "resize-handle"
    );
    expect(resizeTargets.find((target) => target.part === "resize-north-west")?.rect)
      .toEqual({ x: 92, y: 192, width: 16, height: 16 });
    expect(resizeTargets.find((target) => target.part === "resize-south-east")?.rect)
      .toEqual({ x: 252, y: 282, width: 16, height: 16 });
    expect(eventful.find((target) => target.role === "rotate-handle")?.rect)
      .toEqual({ x: 172, y: 174, width: 16, height: 16 });
    expect(compiled.displayList.commands.filter((command) =>
      command.kind === "path"
      && command.fillStyle === "#2563eb"
    ))
      .toHaveLength(9);
    expect(compiled.displayList.commands.filter((command) =>
      command.kind === "path"
      && command.strokeStyle === "#ffffff"
      && command.lineWidth === 2
    ))
      .toHaveLength(9);
  });

  it("projects semantic host colors without changing selected-object geometry", () => {
    const compiled = compileQuireViewNode({
      id: "selected-drawing",
      node: createQuireDrawingSelectedObjectView(160, 90, {
        objectId: "drawing-anchor",
        drawingId: "drawing-payload",
        lockAspectRatio: false,
        showRotationHandle: true
      }),
      origin: { x: 100, y: 200 },
      constraints: {
        minWidth: 160,
        maxWidth: 160,
        minHeight: 90,
        maxHeight: 90
      },
      layer: "overlay"
    });
    const projected = applyQuireObjectSelectionSurfaceConfig(
      compiled.displayList.commands,
      {
        outlineStrokeStyle: "#334455",
        handleFillStyle: "#f8fafc",
        handleStrokeStyle: "#556677"
      }
    );
    const paths = projected.filter(command => command.kind === "path");
    const rotationStem = projected.find(command =>
      command.id.includes(":rotation-stem")
      && command.kind === "fill-rect"
    );

    expect(projected).toHaveLength(compiled.displayList.commands.length);
    expect(paths.find(command => command.id.includes(":outline")))
      .toMatchObject({ strokeStyle: "#334455" });
    expect(rotationStem).toMatchObject({ fillStyle: "#334455" });
    const handlePaths = paths.filter(command =>
      command.id.includes(":resize-")
      || command.id.includes(":rotation-handle")
    );
    expect(handlePaths.filter(command => command.fillStyle === "#f8fafc"))
      .toHaveLength(9);
    expect(handlePaths.filter(command => command.strokeStyle === "#556677"))
      .toHaveLength(9);
    expect(projected.map(command => "rect" in command ? command.rect : undefined)).toEqual(
      compiled.displayList.commands.map(command =>
        "rect" in command ? command.rect : undefined
      )
    );
  });

  it("exposes a selected-only single-click inner story entry target", () => {
    const compiled = compileQuireViewNode({
      id: "selected-text-box",
      node: createQuireDrawingSelectedObjectView(80, 48, {
        objectId: "text-box",
        drawingId: "drawing",
        lockAspectRatio: false,
        storyId: "story",
        textInsetLeft: 5,
        textInsetTop: 4,
        textWidth: 70,
        textHeight: 40
      }),
      origin: { x: 100, y: 200 },
      constraints: {
        minWidth: 80,
        maxWidth: 80,
        minHeight: 48,
        maxHeight: 48
      },
      layer: "overlay"
    });
    const entry = compiled.targets.find((target) => target.part === "text-entry");

    expect(entry?.rect).toEqual({ x: 105, y: 204, width: 70, height: 40 });
    expect(entry?.events.click).toEqual({
      handler: quireDrawingEnterTextHandlerId,
      payload: {
        objectId: "text-box",
        drawingId: "drawing",
        storyId: "story"
      }
    });
    expect(entry?.events.doubleClick).toBeUndefined();
    expect(compiled.targets.find((target) => target.role === "rotate-handle"))
      .toBeUndefined();
    expect(compiled.displayList.commands.filter((command) =>
      command.kind === "path"
      && command.fillStyle === "#2563eb"
    ))
      .toHaveLength(8);
    expect(compiled.displayList.commands.filter((command) =>
      command.kind === "path"
      && command.strokeStyle === "#ffffff"
      && command.lineWidth === 2
    ))
      .toHaveLength(8);
  });

  it("namespaces selected control targets by the exact drawing owner", () => {
    const first = compileQuireViewNode({
      id: "selected-first-picture",
      node: createQuireDrawingSelectedObjectView(160, 90, {
        objectId: "first-picture",
        drawingId: "first-drawing",
        lockAspectRatio: true
      }),
      origin: { x: 100, y: 200 },
      constraints: {
        minWidth: 160,
        maxWidth: 160,
        minHeight: 90,
        maxHeight: 90
      },
      layer: "overlay"
    });
    const second = compileQuireViewNode({
      id: "selected-second-picture",
      node: createQuireDrawingSelectedObjectView(160, 90, {
        objectId: "second-picture",
        drawingId: "second-drawing",
        lockAspectRatio: true
      }),
      origin: { x: 100, y: 420 },
      constraints: {
        minWidth: 160,
        maxWidth: 160,
        minHeight: 90,
        maxHeight: 90
      },
      layer: "overlay"
    });
    const firstTargetIds = new Set(first.targets.map((target) => target.id));

    expect(firstTargetIds.size).toBe(first.targets.length);
    expect(second.targets.every((target) => !firstTargetIds.has(target.id)))
      .toBe(true);
  });

  it("transforms selected controls and preserves exact target polygons", () => {
    const compiled = compileQuireViewNode({
      id: "selected-rotated-picture",
      node: createQuireDrawingSelectedObjectView(160, 90, {
        objectId: "rotated-picture",
        drawingId: "rotated-drawing",
        lockAspectRatio: false
      }),
      origin: { x: 100, y: 200 },
      constraints: {
        minWidth: 160,
        maxWidth: 160,
        minHeight: 90,
        maxHeight: 90
      },
      layer: "overlay"
    });
    const transformed = transformQuireDrawingSelectionProducts({
      commands: compiled.displayList.commands,
      targets: compiled.targets,
      frame: {
        rect: { x: 100, y: 200, width: 160, height: 90 },
        rotation: 90
      }
    });
    const northWest = transformed.targets.find((target) =>
      target.part === "resize-north-west"
    );
    const southEast = transformed.targets.find((target) =>
      target.part === "resize-south-east"
    );

    expect(northWest).toMatchObject({
      rect: { x: 217, y: 157, width: 16, height: 16 },
      hitArea: {
        kind: "polygon",
        points: [
          { x: 233, y: 157 },
          { x: 233, y: 173 },
          { x: 217, y: 173 },
          { x: 217, y: 157 }
        ]
      }
    });
    expect(southEast?.rect).toEqual({
      x: 127,
      y: 317,
      width: 16,
      height: 16
    });
    expect(transformed.commands).not.toEqual(compiled.displayList.commands);
  });
});
