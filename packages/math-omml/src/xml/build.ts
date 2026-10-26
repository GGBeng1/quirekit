import type { OmmlElement, OmmlNode, OmmlRunStyle } from "../types";


/**
 * Builds one element.
 * @param tag - Qualified tag.
 * @param children - Child nodes.
 * @param attributes - Unprefixed attribute map, keyed by qualified name.
 * @returns Preserve-order element.
 */
export function element(tag: string, children: readonly OmmlNode[] = [], attributes?: Readonly<Record<string, string>>): OmmlElement {
  const node: Record<string, unknown> = { [tag]: children };
  if (attributes !== undefined) node[":@"] = Object.fromEntries(Object.entries(attributes).map(([key, value]) => [`@_${key}`, value]));
  return node as OmmlElement;
}

/**
 * Builds a valued math property such as `<m:chr m:val="∑"/>`.
 * @param tag - Qualified tag.
 * @param value - `m:val` value.
 * @returns Property element.
 */
export function property(tag: string, value: string): OmmlElement {
  return element(tag, [], { "m:val": value });
}

/**
 * Builds a structure property element, always closed by Word's control properties.
 * @param tag - Qualified property tag such as `m:fPr`.
 * @param properties - Ordered properties.
 * @returns Property container.
 */
export function properties(tag: string, ...properties: readonly (OmmlElement | undefined)[]): OmmlElement {
  return element(tag, [...properties.filter((item): item is OmmlElement => item !== undefined), element("m:ctrlPr", [wordRunProperties])]);
}

/**
 * Builds one math run.
 * @param text - Run text.
 * @param style - Math run properties.
 * @returns `m:r` element.
 */
export function run(text: string, style: OmmlRunStyle = {}): OmmlElement {
  // CT_RPR order: lit, nor, scr, sty.
  const runProperties = [
    style.nor === true ? element("m:nor") : undefined,
    style.scr === undefined ? undefined : property("m:scr", style.scr),
    style.sty === undefined ? undefined : property("m:sty", style.sty)
  ].filter((item): item is OmmlElement => item !== undefined);
  return element("m:r", [...(runProperties.length === 0 ? [] : [element("m:rPr", runProperties)]), wordRunProperties, element("m:t", [{ "#text": text }])]);
}

/** Word's routine font binding on every math run and control-property element. */
const wordRunProperties = element("w:rPr", [element("w:rFonts", [], { "w:ascii": "Cambria Math", "w:hAnsi": "Cambria Math" })]);
