import { isDefaultProperty, propertyValue } from "./defaults";
import type { OmmlElement, OmmlNode } from "./types";

/** Elements that carry only Word's routine formatting, never formula meaning. */
const routine = new Set(["w:rPr", "m:ctrlPr"]);

/**
 * Reads the tag of a preserve-order element.
 * @param node - Element or text.
 * @returns Tag, or undefined for text.
 */
function tagOf(node: OmmlNode): string | undefined {
  return Object.keys(node).find(key => key !== ":@" && key !== "#text");
}

/**
 * Normalizes OMML for semantic comparison: routine run formatting, properties equal to their defaults and empty
 * property containers are removed,
 * attribute order and namespace declarations are ignored, and adjacent runs with equal properties are merged.
 * @param node - Element or text.
 * @param textContent - Whether the parent is a text element whose whitespace is meaningful.
 * @returns Canonical value, or undefined when the node carries no meaning.
 */
function normalize(node: OmmlNode, textContent = false): unknown {
  if ("#text" in node) {
    const text = String(node["#text"]);
    return !textContent && /^\s*$/u.test(text) ? undefined : { "#text": text };
  }
  const tag = tagOf(node);
  if (tag === undefined || routine.has(tag)) return undefined;
  const source = node[tag] as readonly OmmlNode[];
  const container = tag.startsWith("m:") && tag.endsWith("Pr");
  const children = mergeRuns((container ? normalizeProperties(tag, source) : source.map(child => normalize(child, tag === 'm:t' || tag === 'w:t')))
    .filter(item => item !== undefined) as Record<string, unknown>[]);
  if (container && children.length === 0) return undefined;
  if (tag === "m:r" && !isNormalText(children)) unifyMinus(children);
  const attributes = Object.entries((node[":@"] ?? {}) as Record<string, string>)
    .filter(([key]) => key !== "@_xml:space" && !key.startsWith("@_xmlns"))
    .sort(([a], [b]) => a.localeCompare(b));
  return attributes.length === 0 ? { [tag]: children } : { [tag]: children, ":@": Object.fromEntries(attributes) };
}

/**
 * Reports whether a normalized run is normal text.
 * @param children - Normalized run children.
 * @returns Whether its properties hold `m:nor`.
 */
function isNormalText(children: readonly Record<string, unknown>[]): boolean {
  const properties = children.find(item => "m:rPr" in item)?.["m:rPr"] as readonly Record<string, unknown>[] | undefined;
  return properties?.some(item => "m:nor" in item) === true;
}

/**
 * Writes the minus sign of a math run as a hyphen-minus: Word draws both as minus, and WPS rewrites one as the other.
 * @param children - Normalized run children, changed in place.
 */
function unifyMinus(children: Record<string, unknown>[]): void {
  for (const item of children) {
    if (!("m:t" in item)) continue;
    item["m:t"] = (item["m:t"] as { "#text"?: unknown }[]).map(text => ({ "#text": String(text["#text"] ?? "").replaceAll("\u2212", "-") }));
  }
}

/**
 * Normalizes the properties of one container: toggles become `1`/`0` and defaults are dropped.
 * @param container - Container tag such as `m:naryPr`.
 * @param properties - Property elements.
 * @returns Normalized properties.
 */
function normalizeProperties(container: string, properties: readonly OmmlNode[]): unknown[] {
  const values = new Map<string, string | undefined>();
  for (const property of properties) {
    const tag = tagOf(property);
    if (tag !== undefined) values.set(tag, propertyValue(tag, property));
  }
  return properties.map((property) => {
    const tag = tagOf(property);
    if (tag === undefined || routine.has(tag)) return undefined;
    // Nested containers such as `m:mcs` carry structure rather than a value.
    if (((property as OmmlElement)[tag] as readonly OmmlNode[]).length > 0) return normalize(property);
    const value = values.get(tag);
    if (isDefaultProperty(container, tag, value, values)) return undefined;
    return value === undefined ? { [tag]: [] } : { [tag]: [], ":@": { "@_m:val": value } };
  });
}

/**
 * Merges adjacent runs whose run properties are equal.
 * @param children - Normalized children.
 * @returns Children with merged runs.
 */
function mergeRuns(children: Record<string, unknown>[]): Record<string, unknown>[] {
  const merged: Record<string, unknown>[] = [];
  for (const child of children) {
    const previous = merged.at(-1);
    if (previous !== undefined && "m:r" in previous && "m:r" in child && runProperties(previous) === runProperties(child)) {
      merged[merged.length - 1] = { "m:r": [...propertiesOf(previous), { "m:t": [{ "#text": runText(previous) + runText(child) }] }] };
    } else {
      merged.push(child);
    }
  }
  return merged;
}

/** @param run - Normalized run. @returns Its `m:rPr`, if any. */
function propertiesOf(run: Record<string, unknown>): Record<string, unknown>[] {
  return (run["m:r"] as Record<string, unknown>[]).filter(item => "m:rPr" in item);
}

/** @param run - Normalized run. @returns Serialized run properties. */
function runProperties(run: Record<string, unknown>): string {
  return JSON.stringify(propertiesOf(run));
}

/** @param run - Normalized run. @returns Concatenated run text. */
function runText(run: Record<string, unknown>): string {
  return (run["m:r"] as Record<string, unknown>[])
    .filter(item => "m:t" in item)
    .flatMap(item => item["m:t"] as { "#text"?: unknown }[])
    .map(item => String(item["#text"] ?? ""))
    .join("");
}

/**
 * Serializes OMML for semantic comparison.
 * @param element - `m:oMath` or `m:oMathPara`.
 * @returns Canonical JSON.
 */
export function canonicalOmml(element: OmmlElement): string {
  return JSON.stringify(normalize(element));
}

/**
 * Reports whether two formulas are semantically equal, ignoring Word's routine re-formatting.
 * @param left - First formula.
 * @param right - Second formula.
 * @returns Whether they mean the same formula.
 */
export function sameOmml(left: OmmlElement, right: OmmlElement): boolean {
  return canonicalOmml(left) === canonicalOmml(right);
}

/**
 * Computes a 64-bit FNV-1a fingerprint of a formula's content, stable across Word's routine re-formatting.
 * The display container is excluded: Word wraps a formula that is alone in its paragraph in `m:oMathPara`
 * on save, and display placement is recorded separately from content.
 * @param element - `m:oMath` or `m:oMathPara`.
 * @returns 16 hexadecimal digits.
 */
export function ommlFingerprint(element: OmmlElement): string {
  const content = "m:oMathPara" in element
    ? (element["m:oMathPara"] as OmmlNode[]).filter(node => tagOf(node) === "m:oMath").map(node => canonicalOmml(node as OmmlElement)).join("")
    : canonicalOmml(element);
  let hash = 0xcbf29ce484222325n;
  for (const unit of new TextEncoder().encode(content)) {
    hash ^= BigInt(unit);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}
