import { describe, expect, it } from "vitest";
import {
  decodeQuireImageDataUrl,
  encodeQuireImageDataUrl
} from "./data-url";

describe("portable image data URL transport", () => {
  it("round-trips exact byte ranges without Node.js Buffer", () => {
    const source = Uint8Array.from([0, 1, 2, 127, 128, 254, 255]);
    const encoded = encodeQuireImageDataUrl("image/png", source);

    expect(encoded).toBe("data:image/png;base64,AAECf4D+/w==");
    expect(decodeQuireImageDataUrl(encoded)).toEqual({
      mimeType: "image/png",
      bytes: source
    });
  });

  it("rejects malformed, empty, and non-image transports", () => {
    expect(decodeQuireImageDataUrl("data:text/plain;base64,SGVsbG8="))
      .toBeUndefined();
    expect(decodeQuireImageDataUrl("data:image/png;base64,"))
      .toBeUndefined();
    expect(decodeQuireImageDataUrl("data:image/png,raw"))
      .toBeUndefined();
    expect(() => encodeQuireImageDataUrl("text/plain", Uint8Array.of(1)))
      .toThrow(RangeError);
  });
});
