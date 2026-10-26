import {
  EditorState,
  Schema,
  Selection,
  TextSelection,
  type Node as ProseMirrorNode
} from "@quirekit/pm";
import type { QuireCommandRoutingScope } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import {
  resolveQuireStoryCommandBoundary
} from "./boundary";

describe("story command boundary", () => {
  it("resolves live selectable bounds for retained header/footer sources", () => {
    const fixture = createStoryBoundaryFixture();
    const boundary = resolveQuireStoryCommandBoundary(
      fixture.scope,
      fixture.state.doc
    );

    expect(boundary).toEqual({
      sourceId: "word-story:footer-a",
      regionKind: "footer",
      from: fixture.storyRange.from,
      to: fixture.storyRange.to,
      selectionFrom: fixture.storyStart,
      selectionTo: fixture.storyEnd
    });
  });

  it("does not establish story boundaries for body interaction", () => {
    const fixture = createStoryBoundaryFixture();

    expect(resolveQuireStoryCommandBoundary({
      ...fixture.scope,
      activeRegion: {
        ...fixture.scope.activeRegion!,
        kind: "body"
      }
    }, fixture.state.doc)).toBeNull();
  });

  it("uses the same live command boundary for drawing-text stories", () => {
    const fixture = createStoryBoundaryFixture();
    const boundary = resolveQuireStoryCommandBoundary({
      ...fixture.scope,
      activeRegion: {
        ...fixture.scope.activeRegion!,
        kind: "drawing-text"
      }
    }, fixture.state.doc);

    expect(boundary).toMatchObject({
      sourceId: "word-story:footer-a",
      regionKind: "drawing-text",
      selectionFrom: fixture.storyStart,
      selectionTo: fixture.storyEnd
    });
  });

  it.each(["footnote", "endnote"] as const)("uses the same live command boundary for %s stories", (kind) => {
    const fixture = createStoryBoundaryFixture();
    const boundary = resolveQuireStoryCommandBoundary({
      ...fixture.scope,
      activeRegion: {
        ...fixture.scope.activeRegion!,
        kind
      }
    }, fixture.state.doc);

    expect(boundary).toMatchObject({
      sourceId: "word-story:footer-a",
      regionKind: kind,
      selectionFrom: fixture.storyStart,
      selectionTo: fixture.storyEnd
    });
  });

  it("uses an enclosing story boundary for an exact floating-object target", () => {
    const fixture = createStoryBoundaryFixture();
    const interactionTarget = {
      domain: "object" as const,
      commandTarget: "object" as const,
      hitKind: "object" as const,
      region: {
        rootId: { value: "root:footer-picture" },
        regionId: { value: "region:footer-picture" },
        kind: "floating-object" as const
      },
      source: {
        sourceId: "footer-picture-anchor",
        range: {
          from: fixture.storyRange.from + 1,
          to: fixture.storyRange.from + 2
        }
      },
      interactionScope: {
        region: fixture.scope.activeRegion!,
        source: fixture.scope.activeSource!,
        capabilities: {
          editable: true,
          selectable: true,
          focusable: true,
          copyable: true,
          commandable: true,
          accessible: true
        }
      }
    };
    const boundary = resolveQuireStoryCommandBoundary({
      ...fixture.scope,
      activeRegion: interactionTarget.region,
      activeSource: interactionTarget.source,
      interactionTarget
    }, fixture.state.doc);

    expect(boundary).toMatchObject({
      sourceId: "word-story:footer-a",
      regionKind: "footer",
      selectionFrom: fixture.storyStart,
      selectionTo: fixture.storyEnd
    });
  });

  it("refreshes the structural end from the live story container", () => {
    const fixture = createStoryBoundaryFixture();
    const nextState = fixture.state.apply(
      fixture.state.tr.insertText("!", fixture.storyEnd)
    );
    const boundary = resolveQuireStoryCommandBoundary({
      ...fixture.scope,
      selection: nextState.selection
    }, nextState.doc);

    expect(boundary?.from).toBe(fixture.storyRange.from);
    expect(boundary?.to).toBe(fixture.storyRange.to + 1);
    expect(boundary?.selectionTo).toBe(fixture.storyEnd + 1);
  });
});

/** Story document and retained command facts used by boundary tests. */
interface StoryBoundaryFixture {
  /** Editor state with body and one footer story. */
  readonly state: EditorState;
  /** Retained command scope targeting the footer. */
  readonly scope: QuireCommandRoutingScope;
  /** Structural content range of the footer story. */
  readonly storyRange: { readonly from: number; readonly to: number };
  /** First selectable text position in the footer. */
  readonly storyStart: number;
  /** Last selectable text position in the footer. */
  readonly storyEnd: number;
}

/**
 * Creates one body paragraph plus a persisted footer story.
 *
 * @returns Story fixture with canonical source and selection positions.
 */
function createStoryBoundaryFixture(): StoryBoundaryFixture {
  const schema = createStoryBoundarySchema();
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("body")),
    schema.node("wordStoryStore", null, [
      schema.node("wordStory", { id: "footer-a", kind: "footer" }, [
        schema.node("paragraph", null, schema.text("footer"))
      ])
    ])
  ]);
  const storyRange = findStoryRange(doc, "footer-a");
  const storyStart = Selection.near(doc.resolve(storyRange.from), 1).from;
  const storyEnd = Selection.near(doc.resolve(storyRange.to), -1).to;
  const selection = TextSelection.create(doc, storyStart);
  const state = EditorState.create({ doc, selection });
  const scope: QuireCommandRoutingScope = {
    selection,
    selectionDomain: "text",
    targetKind: "editable-text",
    activeRoot: { value: "root:word-story:footer-a" },
    activeRegion: {
      rootId: { value: "root:word-story:footer-a" },
      regionId: { value: "region:word-story:footer-a" },
      kind: "footer",
      visualInstanceId: "footer-a:page:0"
    },
    activeSource: {
      sourceId: "word-story:footer-a",
      range: storyRange
    }
  };

  return { state, scope, storyRange, storyStart, storyEnd };
}

/**
 * Creates the minimal schema needed to represent a body and auxiliary story.
 *
 * @returns ProseMirror schema for boundary tests.
 */
function createStoryBoundarySchema(): Schema {
  return new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "text*", group: "block" },
      wordStoryStore: { content: "wordStory+", group: "block" },
      wordStory: {
        content: "block+",
        attrs: {
          id: { default: "" },
          kind: { default: "footer" }
        }
      },
      text: { group: "inline" }
    }
  });
}

/**
 * Finds one persisted story's structural content range.
 *
 * @param doc - Document containing the story store.
 * @param storyId - Stable story id to locate.
 * @returns Content range inside the matching story node.
 */
function findStoryRange(
  doc: ProseMirrorNode,
  storyId: string
): { readonly from: number; readonly to: number } {
  let range: { readonly from: number; readonly to: number } | null = null;

  doc.descendants((node, position) => {
    if (node.type.name === "wordStory" && node.attrs.id === storyId) {
      range = { from: position + 1, to: position + node.nodeSize - 1 };
      return false;
    }
    return true;
  });

  if (range === null) {
    throw new Error(`Missing story fixture: ${storyId}`);
  }

  return range;
}
