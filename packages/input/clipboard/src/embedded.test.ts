import { describe, expect, it } from "vitest";
import {
  embedQuireClipboardPayload,
  extractQuireEmbeddedClipboardPayload,
  readQuireClipboardInternalData,
  stripQuireEmbeddedClipboardPayload
} from "./embedded";
import { canvasInternalClipboardMime } from "./internal";

const payload = JSON.stringify({ type: "quirekit/slice", slice: { content: [{ type: "text", text: "中文 & <b>" }] } });

/**
 * Creates a read-only clipboard adapter.
 * @param entries - MIME values.
 * @returns Adapter.
 */
function data(entries: Record<string, string>) {
  return { getData: (type: string) => entries[type] ?? "" };
}

describe("embedded clipboard payload", () => {
  it("round-trips UTF-8 JSON through HTML and strips the marker", () => {
    const html = embedQuireClipboardPayload("<p>hello</p>", payload);
    expect(extractQuireEmbeddedClipboardPayload(html)).toBe(payload);
    expect(stripQuireEmbeddedClipboardPayload(html)).toBe("<p>hello</p>");
  });

  it("survives browser re-serialization around the marker", () => {
    const marker = embedQuireClipboardPayload("", payload).replace("<span ", "<span class=\"x\" ");
    const html = `<html><body><!--StartFragment-->${marker}<p>hello</p><!--EndFragment--></body></html>`;
    expect(extractQuireEmbeddedClipboardPayload(html)).toBe(payload);
  });

  it("prefers the private MIME and falls back to the HTML copy", () => {
    const html = embedQuireClipboardPayload("<p>x</p>", payload);
    expect(readQuireClipboardInternalData(data({ [canvasInternalClipboardMime]: "direct", "text/html": html }))).toBe("direct");
    expect(readQuireClipboardInternalData(data({ "text/html": html }))).toBe(payload);
    expect(readQuireClipboardInternalData(data({ "text/html": "<p>x</p>" }))).toBe("");
    expect(extractQuireEmbeddedClipboardPayload("<span data-quirekit-clipboard=\"v1:%%%\"></span>")).toBeNull();
  });
});
