import type { NodeMetadata } from "@antv/x6";
import { v4 as uuidv4 } from "uuid";

/** @returns Instance-local clip and image markup; the static clip identity survives attribute-only geometry updates. */
export function imageMarkup(): Extract<NonNullable<NodeMetadata["markup"]>, readonly unknown[]> {
  const id = `qk-flow-image-${uuidv4()}`;
  return [
    { tagName: "defs", children: [{ tagName: "clipPath", attrs: { id, clipPathUnits: "userSpaceOnUse" }, children: [{ tagName: "rect", selector: "imageClip" }] }] },
    { tagName: "g", selector: "imageFrame", attrs: { "clip-path": `url(#${id})` }, children: [{ tagName: "image", selector: "image" }] },
  ];
}
