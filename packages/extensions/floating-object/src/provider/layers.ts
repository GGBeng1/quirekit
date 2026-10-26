import {
  qkView,
  type QuireViewEventBindingMap,
  type QuireViewNode,
  type QuireViewOwner
} from "@quirekit/renderer";
import type {
  FloatingObjectManipulation,
  FloatingObjectResizeDirection
} from "../types";

/** qkView event-handler id for captured floating-object manipulation. */
export const floatingObjectManipulationHandlerId = "floatingObject.manipulate";

const handleSize = 10;
const moveBandSize = 8;

/** Directional handle descriptors in stable clockwise order. */
const resizeHandles = [
  { direction: "north-west", cursor: "nwse-resize", inline: 0, block: 0 },
  { direction: "north", cursor: "ns-resize", inline: 0.5, block: 0 },
  { direction: "north-east", cursor: "nesw-resize", inline: 1, block: 0 },
  { direction: "east", cursor: "ew-resize", inline: 1, block: 0.5 },
  { direction: "south-east", cursor: "nwse-resize", inline: 1, block: 1 },
  { direction: "south", cursor: "ns-resize", inline: 0.5, block: 1 },
  { direction: "south-west", cursor: "nesw-resize", inline: 0, block: 1 },
  { direction: "west", cursor: "ew-resize", inline: 0, block: 0.5 }
] as const satisfies readonly {
  readonly direction: FloatingObjectResizeDirection;
  readonly cursor: string;
  readonly inline: number;
  readonly block: number;
}[];

/**
 * Creates persistent object chrome in local layer coordinates.
 *
 * @param width - Accepted object width.
 * @param height - Accepted object height.
 * @param owner - Exact source owner metadata.
 * @returns Renderer-neutral object surface.
 */
export function createFloatingObjectSurface(
  width: number,
  height: number,
  owner: QuireViewOwner
): QuireViewNode {
  return qkView.surface({
    id: "floating-object-surface",
    owner,
    width,
    height,
    style: {
      fill: "#ffffff",
      stroke: { color: "#64748b", width: 1 }
    }
  });
}

/**
 * Creates selected-only manipulation chrome from accepted object geometry.
 *
 * Four transparent frame bands own translation without covering nested editable
 * text. Eight stable handles own directional resize and outrank the bands by
 * appearing later in the overlay tree.
 *
 * @param width - Accepted object width.
 * @param height - Accepted object height.
 * @param owner - Exact source owner metadata.
 * @returns Renderer-neutral controls overlay.
 */
export function createFloatingObjectControls(
  width: number,
  height: number,
  owner: QuireViewOwner
): QuireViewNode {
  return qkView.overlay({
    id: "floating-object-controls",
    owner,
    width,
    height,
    children: [
      qkView.surface({
        id: "floating-object-selection-outline",
        owner,
        width,
        height,
        interaction: { pointerEvents: "none" },
        style: {
          stroke: { color: "#0ea5e9", width: 2 }
        }
      }),
      ...createMoveBands(width, height, owner),
      ...resizeHandles.map((handle) => createResizeHandle(
        width,
        height,
        owner,
        handle
      ))
    ]
  });
}

/**
 * Creates four frame bands that translate a selected object.
 *
 * @param width - Accepted object width.
 * @param height - Accepted object height.
 * @param owner - Exact source owner metadata.
 * @returns Positioned move targets around the object frame.
 */
function createMoveBands(
  width: number,
  height: number,
  owner: QuireViewOwner
): readonly QuireViewNode[] {
  return [
    createMoveBand("north", 0, 0, width, moveBandSize, owner),
    createMoveBand(
      "east",
      Math.max(0, width - moveBandSize),
      0,
      moveBandSize,
      height,
      owner
    ),
    createMoveBand(
      "south",
      0,
      Math.max(0, height - moveBandSize),
      width,
      moveBandSize,
      owner
    ),
    createMoveBand("west", 0, 0, moveBandSize, height, owner)
  ];
}

/**
 * Creates one transparent captured move target.
 *
 * @param part - Stable frame-edge name.
 * @param left - Local inline position.
 * @param top - Local block position.
 * @param width - Target width.
 * @param height - Target height.
 * @param owner - Exact source owner metadata.
 * @returns Positioned move target.
 */
function createMoveBand(
  part: string,
  left: number,
  top: number,
  width: number,
  height: number,
  owner: QuireViewOwner
): QuireViewNode {
  return qkView.positioned({
    id: `floating-object-move-${part}-position`,
    left,
    top,
    child: qkView.surface({
      id: `floating-object-move-${part}`,
      role: "button",
      part: `move-${part}`,
      owner,
      width,
      height,
      events: createManipulationEvents({ kind: "move" }),
      interaction: { cursor: "move" }
    })
  });
}

/**
 * Creates one directional resize handle centered on its object edge or corner.
 *
 * @param width - Accepted object width.
 * @param height - Accepted object height.
 * @param owner - Exact source owner metadata.
 * @param handle - Stable handle direction, cursor, and normalized location.
 * @returns Positioned resize handle.
 */
function createResizeHandle(
  width: number,
  height: number,
  owner: QuireViewOwner,
  handle: typeof resizeHandles[number]
): QuireViewNode {
  const left = handle.inline * Math.max(0, width - handleSize);
  const top = handle.block * Math.max(0, height - handleSize);
  return qkView.positioned({
    id: `floating-object-resize-${handle.direction}-position`,
    left,
    top,
    child: qkView.surface({
      id: `floating-object-resize-${handle.direction}`,
      role: "button",
      part: `resize-${handle.direction}`,
      owner,
      width: handleSize,
      height: handleSize,
      events: createManipulationEvents({
        kind: "resize",
        direction: handle.direction
      }),
      interaction: { cursor: handle.cursor },
      style: {
        fill: "#ffffff",
        stroke: { color: "#0ea5e9", width: 2 }
      }
    })
  });
}

/**
 * Binds every captured pointer phase to one manipulation payload.
 *
 * @param payload - Move or directional resize authority.
 * @returns Event map consumed identically by Canvas and SVG runtimes.
 */
function createManipulationEvents(
  payload: FloatingObjectManipulation
): QuireViewEventBindingMap {
  const binding = {
    handler: floatingObjectManipulationHandlerId,
    payload
  } as const;
  return {
    pointerDown: binding,
    pointerMove: binding,
    pointerUp: binding,
    pointerCancel: binding
  };
}
