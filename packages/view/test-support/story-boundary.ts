import {
  EditorState,
  Schema,
  Selection,
  TextSelection,
  type Node as ProseMirrorNode
} from "@quirekit/pm";
import type { QuireStoryCommandBoundary } from "../src/input/story-boundary/types";

/** State and boundary positions used by story transaction tests. */
export interface StoryBoundaryTestState {
  /** Editor state with body and footer story content. */
  readonly state: EditorState;
  /** Active footer command boundary. */
  readonly boundary: QuireStoryCommandBoundary;
  /** First selectable footer position. */
  readonly storyStart: number;
  /** Last selectable footer position. */
  readonly storyEnd: number;
}

/**
 * Creates a minimal story document and matching live boundary.
 *
 * @returns Test state for transaction guard coverage.
 */
export function createStoryBoundaryTestState(): StoryBoundaryTestState {
  const schema = new Schema({
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
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("body")),
    schema.node("wordStoryStore", null, [
      schema.node("wordStory", { id: "footer-a", kind: "footer" }, [
        schema.node("paragraph", null, schema.text("footer"))
      ])
    ])
  ]);
  const range = findStoryRange(doc);
  const storyStart = Selection.near(doc.resolve(range.from), 1).from;
  const storyEnd = Selection.near(doc.resolve(range.to), -1).to;
  const state = EditorState.create({
    doc,
    selection: TextSelection.create(doc, storyStart)
  });

  return {
    state,
    storyStart,
    storyEnd,
    boundary: {
      sourceId: "word-story:footer-a",
      regionKind: "footer",
      from: range.from,
      to: range.to,
      selectionFrom: storyStart,
      selectionTo: storyEnd
    }
  };
}

/**
 * Finds the footer story content range in the test document.
 *
 * @param doc - Test document containing one story.
 * @returns Structural content range of the story.
 */
function findStoryRange(
  doc: ProseMirrorNode
): { readonly from: number; readonly to: number } {
  let range: { readonly from: number; readonly to: number } | null = null;

  doc.descendants((node, position) => {
    if (node.type.name === "wordStory") {
      range = { from: position + 1, to: position + node.nodeSize - 1 };
      return false;
    }
    return true;
  });

  if (range === null) {
    throw new Error("Missing footer story fixture.");
  }

  return range;
}
