import { describe, expect, it } from "vitest";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import { cloneQuireTextFragmentWithLazyCaretStops, type QuireTextFragment } from "@quirekit/layout/text";
import { clipFixedLineTextCommands } from "./line-clip";
import { createTextFragmentCommand } from "./fragment/command";
import { createQuireDisplayCommandCache } from "./command-cache";
import { createTextFragmentCommandShiftSignatureByKeyParts } from "./signature";
import { createTextblockLayoutSignature } from "../../editor-layout/prosemirror/block-layout-signature";

const fragment: QuireTextFragment = {
  id: "p:text-0", text: "Hg", range: { from: 1, to: 3 }, font: "16px Arial",
  rect: { x: 10, y: 20, width: 16, height: 2 }, baseline: 18,
  lineHeight: 2, clipToLine: true, runAscent: 12, runDescent: 4, caretStops: []
};

describe("fixed line paint clipping", () => {
  it("rebases a repeated first-fragment clip to its own line identity", () => {
    const cache = createQuireDisplayCommandCache();
    const commands: QuireDisplayCommand[] = [createTextFragmentCommand({ id: "p:text", fragment, fillStyle: "#000" })];
    clipFixedLineTextCommands(commands, 0, fragment, "p:text");
    cache.setTextFragmentCommands(fragment, { nodeId: "p", fragmentIndex: 0, defaultFillStyle: "#000" }, commands);
    const next = { ...fragment, id: "p:text-28", range: { from: 29, to: 31 },
      rect: { ...fragment.rect, y: 60 }, baseline: 58 };
    const hit = cache.getTextFragmentCommandsByKey(next, "p", 28, "#000", true)![0]!;
    expect(hit).toMatchObject({ kind: "clip", id: "p:text-28:line-clip", range: next.range,
      rect: { y: 60 }, commands: [{ id: "p:text-28", origin: { y: 58 } }] });
  });

  it("clips only the current paint slice and preserves horizontal overhang", () => {
    const text = createTextFragmentCommand({ id: "p:text-0", fragment, fillStyle: "#000" });
    const commands: QuireDisplayCommand[] = [text, text];
    clipFixedLineTextCommands(commands, 1, fragment, "p:text-0");
    expect(commands).toEqual([text, { kind: "clip", id: "p:text-0:line-clip", range: fragment.range,
      rect: { x: -6, y: 20, width: 48, height: 2 }, commands: [text] }]);
  });

  it("retains clipping through lazy pagination clones and translated command caches", () => {
    const cache = createQuireDisplayCommandCache();
    const key = { nodeId: "p", fragmentIndex: 0, defaultFillStyle: "#000" };
    const commands: QuireDisplayCommand[] = [createTextFragmentCommand({ id: "p:text-0", fragment, fillStyle: "#000" })];
    clipFixedLineTextCommands(commands, 0, fragment, "p:text-0");
    cache.setTextFragmentCommands(fragment, key, commands);
    const clone = cloneQuireTextFragmentWithLazyCaretStops({ source: fragment,
      id: "page-2", range: { from: 11, to: 13 }, rect: { ...fragment.rect, y: 200 },
      baseline: 198, caretStopRangeDelta: 10 });
    expect(clone.clipToLine).toBe(true);
    const hit = cache.getTextFragmentCommandsByKey(clone, "p", 0, "#000", true)![0]!;
    expect(hit.kind).toBe("clip");
    if (hit.kind !== "clip") throw new Error("Expected fixed line clip");
    expect(hit.rect.y).toBe(200);
    expect(hit.commands[0]).toMatchObject({ rect: { y: 200 } });
    const signature = createTextFragmentCommandShiftSignatureByKeyParts;
    expect(signature(fragment, "p", "#000")).not.toBe(signature({ ...fragment, clipToLine: false }, "p", "#000"));
    expect(createTextblockLayoutSignature([fragment], [], [], 1))
      .not.toBe(createTextblockLayoutSignature([{ ...fragment, clipToLine: false }], [], [], 1));
  });
});
