import { QuireEditor } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { floatingObjectViewEventHandlers } from "./event-handlers";
import { FloatingObject } from "./floating-object";
import { floatingObjectManipulationHandlerId } from "./provider/layers";
import type { FloatingObjectManipulation } from "./types";

/** Mutable renderer-neutral event probe for one captured manipulation phase. */
interface ManipulationEventProbe {
  /** Exact source range retained by the target. */
  readonly target: {
    /** Document range represented by the selected object. */
    readonly range: { readonly from: number; readonly to: number };
  };
  /** Extension-owned move or resize payload. */
  readonly payload: FloatingObjectManipulation;
  /** Shared captured pointer facts. */
  readonly pointerSession: {
    /** Stable pointer identifier. */
    readonly pointerId: number;
    /** Current captured lifecycle phase. */
    readonly phase: "start" | "update" | "end" | "cancel";
    /** Gesture origin in renderer coordinates. */
    readonly startPoint: { readonly x: number; readonly y: number };
    /** Point dispatched by the preceding phase. */
    readonly previousPoint: { readonly x: number; readonly y: number };
    /** Current renderer-space point. */
    readonly point: { readonly x: number; readonly y: number };
    /** Displacement from the gesture origin. */
    readonly delta: { readonly x: number; readonly y: number };
  };
  /** Whether shared pointer capture was requested. */
  captureRequested: boolean;
  /** Requests shared pointer capture. */
  capturePointer(): void;
  /** Prevents the platform default. */
  preventDefault(): void;
  /** Stops retained target propagation. */
  stopPropagation(): void;
}

const manipulate = floatingObjectViewEventHandlers[floatingObjectManipulationHandlerId];

describe("floating-object captured event handlers", () => {
  it("restores initial geometry when the exact gesture is cancelled", () => {
    const editor = createEditor();
    const range = readObjectRange(editor);

    expect(dispatchAction(editor, createEvent(range, "start"))).toBe(true);
    expect(dispatchAction(editor, createEvent(
      range,
      "update",
      { x: 24, y: 12 },
      { x: 0, y: 0 }
    ))).toBe(true);
    expect(editor.state.doc.nodeAt(0)?.attrs).toMatchObject({
      inlineOffset: 24,
      blockOffset: 12
    });

    expect(dispatchAction(editor, createEvent(
      range,
      "cancel",
      { x: 24, y: 12 },
      { x: 24, y: 12 }
    ))).toBe(true);
    expect(editor.state.pm.selection).toBeInstanceOf(NodeSelection);
    expect(editor.state.doc.nodeAt(0)?.attrs).toMatchObject({
      inlineOffset: 0,
      blockOffset: 0
    });
  });

  it("rejects a captured gesture after another transaction replaces its source", () => {
    const editor = createEditor();
    const range = readObjectRange(editor);
    expect(dispatchAction(editor, createEvent(range, "start"))).toBe(true);

    const original = editor.state.doc.nodeAt(0);
    if (original === null) {
      throw new Error("Expected a floating object at the document start.");
    }
    const paragraphType = original.type.schema.nodes.paragraph;
    if (paragraphType === undefined) {
      throw new Error("Expected the fixture schema to provide paragraph content.");
    }
    const replacement = original.type.create(
      {
        ...original.attrs,
        width: 320,
        inlineOffset: 40
      },
      paragraphType.create(
        null,
        original.type.schema.text("Replacement object")
      )
    );
    editor.dispatchTransaction(editor.state.pm.tr.replaceWith(
      range.from,
      range.to,
      replacement
    ));

    expect(dispatchAction(editor, createEvent(
      range,
      "cancel",
      { x: 24, y: 12 },
      { x: 24, y: 12 }
    ))).toBe(false);
    expect(editor.state.doc.nodeAt(0)?.textContent).toBe("Replacement object");
    expect(editor.state.doc.nodeAt(0)?.attrs).toMatchObject({
      width: 320,
      inlineOffset: 40
    });
  });
});

/**
 * Creates one editor containing a single provider-backed floating object.
 *
 * @returns Editor suitable for captured event handler tests.
 */
function createEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, FloatingObject],
    content: {
      type: "doc",
      content: [{
        type: "floatingObject",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Original object" }]
        }]
      }]
    }
  });
}

/**
 * Reads the exact source range of the fixture object.
 *
 * @param editor - Editor containing the fixture object.
 * @returns Range represented by its manipulation targets.
 */
function readObjectRange(
  editor: QuireEditor
): Readonly<{ from: number; to: number }> {
  const object = editor.state.doc.nodeAt(0);
  if (object === null) {
    throw new Error("Expected a floating object at the document start.");
  }
  return { from: 0, to: object.nodeSize };
}

/**
 * Dispatches one event through the extension-owned public event-handler map.
 *
 * @param editor - Editor receiving the handler.
 * @param event - Captured event probe.
 * @returns Whether the handler handled the event.
 */
function dispatchAction(
  editor: QuireEditor,
  event: ManipulationEventProbe
): boolean | void {
  return manipulate({ editor, status: "primary" } as never, event as never);
}

/**
 * Creates one renderer-neutral captured manipulation event.
 *
 * @param range - Exact source range.
 * @param phase - Captured lifecycle phase.
 * @param point - Current renderer-space point.
 * @param previousPoint - Point from the preceding phase.
 * @returns Mutable event probe consumed by the handler.
 */
function createEvent(
  range: Readonly<{ from: number; to: number }>,
  phase: ManipulationEventProbe["pointerSession"]["phase"],
  point: Readonly<{ x: number; y: number }> = { x: 0, y: 0 },
  previousPoint: Readonly<{ x: number; y: number }> = { x: 0, y: 0 }
): ManipulationEventProbe {
  return {
    target: { range },
    payload: { kind: "move" },
    pointerSession: {
      pointerId: 7,
      phase,
      startPoint: { x: 0, y: 0 },
      previousPoint,
      point,
      delta: point
    },
    captureRequested: false,
    capturePointer() {
      this.captureRequested = true;
    },
    preventDefault() {},
    stopPropagation() {}
  };
}
