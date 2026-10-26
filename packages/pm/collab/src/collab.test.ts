import type * as PMCollab from "./collab";
import { Schema } from "@quirekit/pm-model";
import { EditorState } from "@quirekit/pm-state";
import { describe, expect, it } from "vitest";

const distEntry = "../dist/collab.mjs";
const { collab, getVersion, sendableSteps } = (await import(distEntry)) as typeof PMCollab;

describe("pm-collab vendored API", () => {
  it("tracks version and sendable local steps", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "text*" },
        text: {}
      }
    });
    const state = EditorState.create({
      schema,
      plugins: [collab({ clientID: "quirekit-test", version: 3 })]
    });
    const next = state.apply(state.tr.insertText("hello", 0));
    const sendable = sendableSteps(next);

    expect(getVersion(state)).toBe(3);
    expect(sendable?.version).toBe(3);
    expect(sendable?.steps).toHaveLength(1);
  });
});
