import { expect, it } from "vitest";
import { createFlowchart, parseFlowchart, readFlowchart, serializeFlowchart } from "../index";
import { createFlowchartImageNode, flowchartSvgImage, readFlowchartImage } from "./image";
import { flowchartImagePlacement } from "./geometry";

const image = flowchartSvgImage('<svg viewBox="0 0 200 100"><rect width="200" height="100" fill="#2563eb"/></svg>');
it("maps an asymmetric source crop into contain and cover without exposing removed content in letterboxes", () => {
  const crop = { top: .1, right: .1, bottom: .3, left: .3 }, source = readFlowchartImage({ ...image, crop, fit: "contain", lockAspectRatio: true });
  const contained = flowchartImagePlacement(source, 240, 240);
  expect(contained).toEqual({ x: -120, y: 40, width: 400, height: 200, clip: { x: 0, y: 60, width: 240, height: 120 } });
  const covered = flowchartImagePlacement({ ...source, fit: "cover" }, 240, 240);
  expect(covered).toEqual({ x: -360, y: -40, width: 800, height: 400, clip: { x: 0, y: 0, width: 240, height: 240 } });
  const document = readFlowchart({ ...createFlowchart(), nodes: [createFlowchartImageNode("crop", source, { x: -120, y: 40 })] });
  expect(parseFlowchart(serializeFlowchart(document))).toEqual(document);
  expect(Object.isFrozen(document.nodes[0]!.image!.crop)).toBe(true);
  expect(document.nodes[0]!.image!.dataUrl).toBe(image.dataUrl);
  expect(document.nodes[0]!.width / document.nodes[0]!.height).toBe(2);
  const square = readFlowchartImage({ ...image, crop: { top: 0, right: .25, bottom: 0, left: .25 } });
  const inserted = createFlowchartImageNode("square", square, { x: 0, y: 0 }); expect(inserted.width).toBe(inserted.height);
});
it("keeps legacy full-image containment and rejects illegal or vanishing crop fields", () => {
  expect(flowchartImagePlacement(image, 200, 200)).toEqual({ x: 0, y: 50, width: 200, height: 100, clip: { x: 0, y: 50, width: 200, height: 100 } });
  for (const patch of [
    { fit: "stretch" }, { lockAspectRatio: "true" },
    { crop: { top: 0, right: 0, bottom: 0, left: -.1 } },
    { crop: { top: .5, right: 0, bottom: .5, left: 0 } },
    { crop: { top: 0, right: .998, bottom: 0, left: 0 } },
    { crop: { top: NaN, right: 0, bottom: 0, left: 0 } },
    { crop: { get top() { throw new Error("Getter invoked"); }, right: 0, bottom: 0, left: 0 } },
  ]) expect(() => readFlowchartImage({ ...image, ...patch })).toThrow();
  expect(readFlowchartImage({ ...image, crop: { top: 0, right: .995, bottom: 0, left: 0 } }).crop).toBeDefined();
});
