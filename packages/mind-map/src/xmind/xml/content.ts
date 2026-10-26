import { xmindArray } from "../reading";
import { extras, parseXml, titleFields, xmlRecord } from "./helpers";
import { legacyAnnotation, legacyStyles } from "./styles";
import { legacyTopicReader } from "./topics";

/** @param source - Bounded content.xml. @param stylesSource - Optional legacy styles.xml. @returns Modern sheet data with explicit unconverted fields. */
export function parseXmindXml(source: string, stylesSource?: string): unknown {
  const content = xmlRecord(parseXml(source)["xmap-content"], "xmap-content"), sheets = xmindArray(content.sheet, "xmap-content.sheet");
  if (!sheets.length || sheets.length > 100) throw new RangeError("XMind: sheet budget exceeded");
  const styles = legacyStyles(stylesSource), topic = legacyTopicReader(styles.properties);
  const unknownContent = extras(content, ["sheet", "@xmlns", "@version", "@timestamp", "#text"]);
  return sheets.map((value, index) => {
    const sheet = xmlRecord(value, "sheet"), roots = xmindArray(sheet.topic, "sheet.topic");
    if (roots.length !== 1) throw new TypeError("XMind: each sheet requires exactly one root topic");
    const relations = sheet.relationships === undefined ? {} : xmlRecord(sheet.relationships, "relationships");
    const theme = typeof sheet["@theme"] === "string" ? styles.themes.get(sheet["@theme"]) : undefined;
    return { ...extras(sheet, ["@id", "@timestamp", ...(theme ? ["@theme"] : []), "title", "topic", "relationships", "#text"]),
      ...(theme ? { theme } : {}),
      ...(sheet["@id"] === undefined ? {} : { id: sheet["@id"] }), ...(sheet.title === undefined ? {} : titleFields(sheet.title, "sheet.title")),
      ...(index === 0 && Object.keys(unknownContent).length ? { xmlContent: unknownContent } : {}), rootTopic: topic(roots[0], 0),
      ...(relations.relationship === undefined ? {} : { relationships: xmindArray(relations.relationship, "relationships.relationship").map(value => legacyAnnotation(value, styles.properties)) }) };
  });
}
