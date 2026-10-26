import { readMindMapDetails, type MindMapTopicDetails } from "@quirekit/mind-map";
export const simpleDetailsKeys = ["hyperlink", "note", "icon", "image", "imageSize", "imageTitle"] as const;

/** @param details - Admitted canonical content. @returns Literal pinned fields consumed by native measurement. */
export function toSimpleDetails(details: MindMapTopicDetails | undefined): Record<string, unknown> {
  if (!details) return {};
  return { ...(details.link !== undefined ? { hyperlink: details.link } : {}), ...(details.note !== undefined ? { note: details.note } : {}),
    ...(details.marker ? { icon: [details.marker.replace("-", "_")] } : {}),
    ...(details.image ? { image: details.image.dataUrl, imageSize: { width: details.image.width, height: details.image.height, custom: true }, imageTitle: details.image.alt } : {}) };
}

/** @param data - Strictly admitted vendor node fields. @returns Canonical content, rejecting mismatched field combinations. */
export function fromSimpleDetails(data: Record<string, unknown>): MindMapTopicDetails | undefined {
  const value: Record<string, unknown> = {};
  if (data.hyperlink !== undefined) value.link = data.hyperlink;
  if (data.note !== undefined) value.note = data.note;
  if (data.icon !== undefined) {
    if (!Array.isArray(data.icon) || data.icon.length !== 1 || !["priority_1", "priority_2", "priority_3"].includes(data.icon[0])) throw new TypeError("Unsupported mind map marker");
    value.marker = (data.icon[0] as string).replace("_", "-");
  }
  if (data.image !== undefined) {
    const size = data.imageSize as Record<string, unknown> | undefined;
    if (!size || typeof size !== "object" || size.custom !== true || Object.keys(size).some(key => !["width", "height", "custom"].includes(key))) throw new TypeError("Invalid mind map image size");
    value.image = { dataUrl: data.image, width: size.width, height: size.height, alt: data.imageTitle };
  } else if (data.imageSize !== undefined || data.imageTitle !== undefined) throw new TypeError("Missing mind map image source");
  return Object.keys(value).length ? readMindMapDetails(value) : undefined;
}
