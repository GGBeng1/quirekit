import { TextSelection } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import {
  isQuireTransactionInsideStoryCommandBoundary
} from "./transaction";
import {
  createStoryBoundaryTestState
} from "../../../test-support/story-boundary";

describe("story command transaction guard", () => {
  it("accepts story-local insertions and remaps the selectable end", () => {
    const fixture = createStoryBoundaryTestState();
    const transaction = fixture.state.tr.insertText("!", fixture.storyEnd);

    expect(isQuireTransactionInsideStoryCommandBoundary(
      transaction,
      fixture.boundary
    )).toBe(true);
  });

  it("rejects mutations that touch body content", () => {
    const fixture = createStoryBoundaryTestState();
    const transaction = fixture.state.tr.delete(1, 2);

    expect(isQuireTransactionInsideStoryCommandBoundary(
      transaction,
      fixture.boundary
    )).toBe(false);
  });

  it("rejects selection-only transactions that leave the story", () => {
    const fixture = createStoryBoundaryTestState();
    const transaction = fixture.state.tr.setSelection(
      TextSelection.create(fixture.state.doc, 2)
    );

    expect(isQuireTransactionInsideStoryCommandBoundary(
      transaction,
      fixture.boundary
    )).toBe(false);
  });

  it("accepts selection-only transactions inside the story", () => {
    const fixture = createStoryBoundaryTestState();
    const transaction = fixture.state.tr.setSelection(
      TextSelection.create(fixture.state.doc, fixture.storyEnd)
    );

    expect(isQuireTransactionInsideStoryCommandBoundary(
      transaction,
      fixture.boundary
    )).toBe(true);
  });
});
