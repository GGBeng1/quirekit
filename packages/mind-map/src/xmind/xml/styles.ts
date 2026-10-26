import { xmindArray } from "../reading";
import { extras, parseXml, xmlRecord } from "./helpers";
import type { XmindLegacyStyles } from "./types";

/** @param source - Optional styles.xml. @returns Resolved topic and annotation properties. */
export function legacyStyles(source?: string): XmindLegacyStyles {
  const result = new Map<string, Record<string, unknown>>(), themes = new Map<string, Record<string, unknown>>();
  if (!source) return { properties: result, themes };
  const root = xmlRecord(parseXml(source, true)["xmap-styles"], "styles");
  const themeSources: Record<string, unknown>[] = [];
  for (const family of ["automatic-styles", "master-styles", "styles"]) {
    if (root[family] === undefined) continue;
    const list = xmlRecord(root[family], family).style;
    for (const value of list === undefined ? [] : xmindArray(list, "styles.style")) {
      const style = xmlRecord(value, "style"), id = style["@id"];
      if (typeof id !== "string" || result.has(id)) throw new TypeError("XMind: invalid or duplicate style identity");
      const kind = style["@type"], properties = style[`${String(kind)}-properties`];
      result.set(id, properties === undefined ? {} : Object.fromEntries(Object.entries(xmlRecord(properties, "properties")).map(([key, value]) => [key.startsWith("@") ? key.slice(1) : key, value])));
      if (kind === "theme") themeSources.push(style);
    }
  }
  // Resolve role references after all families have been indexed; later explicit
  // topic styles overlay these defaults in the common modern reader.
  for (const source of themeSources) {
    const theme: Record<string, unknown> = {}, defaults = xmlRecord(source["theme-properties"], "theme")["default-style"];
    for (const value of defaults === undefined ? [] : Array.isArray(defaults) ? defaults : [defaults]) {
      const entry = xmlRecord(value, "default-style"), role = entry["@style-family"], id = entry["@style-id"];
      if (typeof role === "string" && typeof id === "string") theme[role] = result.has(id) ? { properties: result.get(id) } : id;
    }
    themes.set(source["@id"] as string, theme);
  }
  return { properties: result, themes };
}

/** @param node - XML owner. @param styles - Source style table. @returns Resolved style or explicit unresolved reference. */
export function legacyStyle(node: Record<string, unknown>, styles: ReadonlyMap<string, Record<string, unknown>>): Record<string, unknown> {
  const id = node["@style-id"]; if (id === undefined) return {};
  return typeof id === "string" && styles.has(id) ? { style: { properties: styles.get(id) } } : { "@style-id": id };
}

/** @param input - XML relation/group. @param styles - Resolved properties. @returns Modern annotation record retaining unknown fields. */
export function legacyAnnotation(input: unknown, styles: ReadonlyMap<string, Record<string, unknown>>): Record<string, unknown> {
  const node = xmlRecord(input, "annotation"), keys = { "@id": "id", "@end1": "end1Id", "@end2": "end2Id", "@range": "range", "@topic-id": "topicId" };
  return { ...extras(node, [...Object.keys(keys), "@style-id", "title", "#text"]), ...legacyStyle(node, styles),
    ...Object.fromEntries(Object.entries(keys).filter(([key]) => node[key] !== undefined).map(([key, target]) => [target, node[key]])),
    ...(node.title === undefined ? {} : { title: typeof node.title === "string" ? node.title : xmlRecord(node.title, "title")["#text"] ?? "" }) };
}
