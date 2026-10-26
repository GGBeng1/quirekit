import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../../layout";
import { appendStyledTextFragmentCommands } from "./style-split";

const node: QuireLayoutNode = {
  id: "paragraph",
  kind: "block",
  range: { from: 0, to: 8 },
  rect: { x: 0, y: 0, width: 200, height: 24 }
};

describe("hidden-text display compilation", () => {
  it("emits no paint command for a collapsed source fragment", () => {
    const commands: QuireDisplayCommand[] = [];

    appendStyledTextFragmentCommands(createOptions(
      commands,
      createFragment("collapsed")
    ));

    expect(commands).toEqual([]);
  });

  it("adds one metric-neutral dotted cue in formatting-inspection mode", () => {
    const commands: QuireDisplayCommand[] = [];

    appendStyledTextFragmentCommands(createOptions(
      commands,
      createFragment("inspection")
    ));

    expect(commands).toEqual([
      expect.objectContaining({ kind: "text", text: "secret" }),
      expect.objectContaining({
        id: "paragraph:text:hidden-text-inspection",
        kind: "line",
        layer: "content",
        range: { from: 1, to: 7 },
        from: { x: 10, y: 39 },
        to: { x: 70, y: 39 },
        lineDash: [1.5, 2],
        lineCap: "round"
      })
    ]);
  });
});

/**
 * Creates styled-fragment command inputs for one hidden-text mode.
 *
 * @param commands - Mutable command sink.
 * @param fragment - Measured fragment fixture.
 * @returns Complete style-split inputs.
 */
function createOptions(
  commands: QuireDisplayCommand[],
  fragment: QuireTextFragment
): Parameters<typeof appendStyledTextFragmentCommands>[0] {
  return {
    commands,
    node,
    fragment,
    fragmentIndex: 0,
    textStyles: [],
    defaultFillStyle: "#111111",
    imePreeditBackgroundFillStyle: "#eeeeee",
    imePreeditBackground: false,
    imePreeditUnderline: false
  };
}

/**
 * Creates a deterministic hidden-text fragment.
 *
 * @param hiddenText - Layout participation to retain.
 * @returns Measured fragment with stable geometry.
 */
function createFragment(
  hiddenText: NonNullable<QuireTextFragment["hiddenText"]>
): QuireTextFragment {
  return {
    id: "secret",
    text: hiddenText === "collapsed" ? "" : "secret",
    range: { from: 1, to: 7 },
    rect: { x: 10, y: 20, width: hiddenText === "collapsed" ? 0 : 60, height: 20 },
    font: "16px sans-serif",
    hiddenText,
    lineHeight: 20,
    baseline: 38,
    caretStops: [
      { position: { pos: 1, bias: 1 }, localX: 0 },
      { position: { pos: 7, bias: -1 }, localX: hiddenText === "collapsed" ? 0 : 60 }
    ]
  };
}
