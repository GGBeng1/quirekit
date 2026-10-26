import { TextSelection, type Transaction } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireLayoutSnapshot,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import { createStoryBoundaryTestState } from "../../../../test-support/story-boundary";
import type { QuireMountedEditorView } from "../types";
import { applyMountedPointerRangeSelection } from "./range-selection";

describe("mounted story pointer range selection", () => {
  it("does not collapse a retained range or clear input/paint ownership when the head misses", () => {
    const fixture = createStoryBoundaryTestState();
    let state = fixture.state.apply(fixture.state.tr.setSelection(TextSelection.create(fixture.state.doc, fixture.storyStart, fixture.storyEnd)));
    const original = state.selection;
    const dispatch = vi.fn((transaction: Transaction) => { state = state.apply(transaction); });
    const setInteractionTarget = vi.fn(), setSelectionGeometryContext = vi.fn(), renderSelection = vi.fn();
    const result = applyMountedPointerRangeSelection({
      mountedView: { status: "primary", editable: true, get state() { return state; }, dispatch, someProp: () => undefined } as unknown as QuireMountedEditorView,
      geometrySnapshot: createLayoutSnapshot(),
      anchorHitTestResult: createOwnedPositionHit({ pos: fixture.storyStart, y: 100,
        sourceId: fixture.boundary.sourceId, range: { from: fixture.boundary.from, to: fixture.boundary.to }, region: "footer" }),
      headHitTestResult: { kind: "miss" }, headInteractionTarget: null,
      setInteractionTarget, setSelectionGeometryContext, renderSelection, onPointerHitTest: () => {}
    });
    expect(result.updated).toBe(false);
    expect(state.selection).toBe(original);
    for (const effect of [dispatch, setInteractionTarget, setSelectionGeometryContext, renderSelection]) expect(effect).not.toHaveBeenCalled();
  });

  it("preserves the current text range when its moving head enters a marker control", () => {
    const fixture = createStoryBoundaryTestState();
    let state = fixture.state;
    const dispatches: Transaction[] = [];
    const activeTargets: Array<QuireInteractionSelectionTarget | null> = [];
    let renderCount = 0;
    const anchorHit = createOwnedPositionHit({
      pos: fixture.storyStart + 2,
      y: 100,
      sourceId: fixture.boundary.sourceId,
      range: { from: fixture.boundary.from, to: fixture.boundary.to },
      region: "footer",
      visualInstanceId: "page:1:footer"
    });
    const markerFallbackHit = createOwnedPositionHit({
      pos: 1,
      y: 40,
      sourceId: "document:body",
      range: { from: 0, to: 6 },
      region: "body"
    });

    const result = applyMountedPointerRangeSelection({
      mountedView: {
        status: "primary",
        editable: true,
        get state() {
          return state;
        },
        dispatch: (transaction: Transaction) => {
          dispatches.push(transaction);
          state = state.apply(transaction);
        },
        someProp: () => undefined
      } as unknown as QuireMountedEditorView,
      geometrySnapshot: createLayoutSnapshot(),
      anchorHitTestResult: anchorHit,
      headHitTestResult: markerFallbackHit,
      headInteractionTarget: createMarkerDispatchTarget(),
      setInteractionTarget: (target) => {
        activeTargets.push(target);
      },
      setSelectionGeometryContext: () => {},
      onPointerHitTest: () => {},
      renderSelection: () => {
        renderCount += 1;
      }
    });

    expect(result.updated).toBe(false);
    expect(dispatches).toHaveLength(0);
    expect(renderCount).toBe(0);
    expect(activeTargets).toHaveLength(0);
    expect(state.selection.anchor).toBe(fixture.storyStart);
    expect(state.selection.head).toBe(fixture.storyStart);
  });

  it("keeps an active footer drag inside its retained story", () => {
    const fixture = createStoryBoundaryTestState();
    let state = fixture.state;
    const activeTargets: Array<QuireInteractionSelectionTarget | null> = [];
    const selectionContexts: Array<QuireSelectionGeometryContext | undefined> = [];
    const anchorHit = createOwnedPositionHit({
      pos: fixture.storyStart + 2,
      y: 100,
      sourceId: fixture.boundary.sourceId,
      range: { from: fixture.boundary.from, to: fixture.boundary.to },
      region: "footer",
      visualInstanceId: "page:1:footer"
    });
    const bodyHead = createOwnedPositionHit({
      pos: 2,
      y: 40,
      sourceId: "document:body",
      range: { from: 0, to: 6 },
      region: "body"
    });

    applyMountedPointerRangeSelection({
      mountedView: {
        status: "primary",
        editable: true,
        get state() {
          return state;
        },
        dispatch: (transaction: Transaction) => {
          state = state.apply(transaction);
        },
        someProp: () => undefined
      } as unknown as QuireMountedEditorView,
      geometrySnapshot: createLayoutSnapshot(),
      anchorHitTestResult: anchorHit,
      headHitTestResult: bodyHead,
      headInteractionTarget: null,
      setInteractionTarget: (target) => {
        activeTargets.push(target);
      },
      setSelectionGeometryContext: (context) => {
        selectionContexts.push(context);
      },
      onPointerHitTest: () => {},
      renderSelection: () => {}
    });

    expect(state.selection.anchor).toBe(fixture.storyStart + 2);
    expect(state.selection.head).toBe(fixture.storyStart);
    expect(state.selection.from).toBeGreaterThanOrEqual(fixture.storyStart);
    expect(state.selection.to).toBeLessThanOrEqual(fixture.storyEnd);
    expect(activeTargets.at(-1)?.source?.sourceId).toBe(fixture.boundary.sourceId);
    expect(selectionContexts.at(-1)?.ownerSource?.sourceId).toBe(
      fixture.boundary.sourceId
    );
  });
});

/**
 * Creates the dispatch-only target retained by a generated list marker.
 *
 * @returns Marker interaction target that cannot become a text drag endpoint.
 */
function createMarkerDispatchTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "control",
    commandTarget: "widget",
    hitKind: "widget",
    pointerPolicy: {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    }
  };
}

/** Inputs used to create one retained position hit. */
interface OwnedPositionHitOptions {
  /** Global ProseMirror position represented by the hit. */
  readonly pos: number;
  /** Document-space vertical coordinate. */
  readonly y: number;
  /** Stable source identity represented by the hit. */
  readonly sourceId: string;
  /** Structural source range represented by the hit. */
  readonly range: { readonly from: number; readonly to: number };
  /** Retained layout region kind. */
  readonly region: "body" | "footer";
  /** Optional page-local story occurrence identity. */
  readonly visualInstanceId?: string | undefined;
}

/**
 * Creates one retained position hit for the integrated drag-selection test.
 *
 * @param options - Position, source, region, and geometry facts.
 * @returns Retained position hit.
 */
function createOwnedPositionHit(
  options: OwnedPositionHitOptions
): QuireHitTestResult {
  return {
    kind: "position",
    position: { pos: options.pos, bias: 1 },
    inside: options.pos,
    rect: { x: 40, y: options.y, width: 8, height: 20 },
    viewRegion: {
      rootId: { value: `root:${options.region}` },
      regionId: { value: `region:${options.region}` },
      kind: options.region,
      ...(options.visualInstanceId === undefined
        ? {}
        : { visualInstanceId: options.visualInstanceId })
    },
    ownerSource: {
      sourceId: options.sourceId,
      range: options.range
    },
    ownerCapabilities: {
      editable: true,
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    }
  };
}

/**
 * Creates a minimal layout snapshot for mounted story range tests.
 *
 * @returns Layout snapshot test double.
 */
function createLayoutSnapshot(): QuireLayoutSnapshot {
  return {
    viewportRect: { x: 0, y: 0, width: 120, height: 80 }
  } as QuireLayoutSnapshot;
}
