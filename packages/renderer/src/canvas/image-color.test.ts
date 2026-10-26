import { expect, it } from "vitest";
import { adjustImageChannels } from "./image-color";
import { serializeSvgDisplayListToSvg } from "../svg/serialize";

it("adjusts black, gray and white in sRGB while preserving transparency", () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 128, 128, 128, 128, 255, 255, 255, 0]);
  adjustImageChannels(pixels, { slope: 0.3, intercept: 0.7 });
  expect([...pixels]).toEqual([178, 178, 178, 255, 217, 217, 217, 128, 255, 255, 255, 0]);
});

it("serializes the same color transform inside crop and destination rotation", () => {
  const svg = serializeSvgDisplayListToSvg({ displayList: { bounds: { x: 0, y: 0, width: 100, height: 100 },
    commands: [{ kind: "image", id: "image:1", rect: { x: 10, y: 20, width: 40, height: 20 }, href: "data:image/png;base64,A",
      sourceRect: { x: 2, y: 2, width: 4, height: 2 }, sourceSize: { width: 8, height: 4 },
      transform: { rotation: 315, flipHorizontal: false, flipVertical: false }, colorAdjustment: { slope: 0.3, intercept: 0.7 }, opacity: 0.5 }] } });
  expect(svg).toContain('color-interpolation-filters="sRGB"');
  expect(svg).toContain('slope="0.3" intercept="0.7"');
  expect(svg).toContain('viewBox="2 2 4 2"');
  expect(svg).toContain('opacity="0.5"');
  expect(svg).toContain('<g transform="matrix(');
});
