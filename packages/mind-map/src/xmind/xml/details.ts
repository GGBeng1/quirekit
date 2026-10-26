import { xmindArray } from "../reading";
import { extras, titleFields, xmlRecord } from "./helpers";

/** @param node - Legacy topic. @returns Modern content fields with unconsumed metadata retained. */
export function legacyDetails(node: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (node["@href"] !== undefined) result.href = node["@href"];
  if (node.notes !== undefined) {
    const notes = xmlRecord(node.notes, "notes"); result.notes = { ...extras(notes, ["plain", "#text"]),
      ...(notes.plain === undefined ? {} : { plain: { content: titleFields(notes.plain, "notes.plain").title } }) };
  }
  if (node["marker-refs"] !== undefined) {
    const markers = xmlRecord(node["marker-refs"], "marker-refs");
    result.markers = (markers["marker-ref"] === undefined ? [] : xmindArray(markers["marker-ref"], "marker-ref")).map(value => {
      const marker = xmlRecord(value, "marker-ref"); return { ...extras(marker, ["@marker-id", "#text"]), markerId: marker["@marker-id"] };
    });
  }
  const image = node.img ?? node.image;
  if (image !== undefined) {
    const value = xmlRecord(image, "image"); result.image = { ...extras(value, ["@src", "@width", "@height", "#text"]), src: value["@src"],
      ...(value["@width"] === undefined ? {} : { width: Number(value["@width"]) }), ...(value["@height"] === undefined ? {} : { height: Number(value["@height"]) }) };
  }
  return result;
}
