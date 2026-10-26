import { array, choice, record } from "../model/validation";
import type { FlowchartNodeContent } from "./types";

/** @param input - Untrusted node. @param boundedText - Document text-budget authority. @returns Admitted structured content. */
export function readNodeContent(input: Record<string, unknown>, boundedText: (value: unknown) => string): Pick<FlowchartNodeContent, "entity" | "uml"> {
  if (input.shape !== "er-entity" && Object.hasOwn(input, "entity")) throw new TypeError("entity: requires er-entity shape");
  if (input.shape !== "uml-class" && Object.hasOwn(input, "uml")) throw new TypeError("uml: requires uml-class shape");
  /** @param value - Candidate cell. @returns Single-line text charged against the whole document. */
  function line(value: unknown): string {
    const result = boundedText(value);
    if (result.length > 300 || /[\r\n\t]/u.test(result)) throw new TypeError("member: expected a single line of at most 300 characters");
    return result;
  }
  if (input.shape === "uml-class") {
    const uml = record(input.uml, ["attributes", "operations"], "uml");
    return { uml: Object.freeze({ attributes: Object.freeze(array(uml.attributes, 100).map(line)), operations: Object.freeze(array(uml.operations, 100).map(line)) }) };
  }
  if (input.shape !== "er-entity") return {};
  const entity = record(input.entity, ["fields"], "entity");
  return { entity: Object.freeze({ fields: Object.freeze(array(entity.fields, 100).map(value => {
    const row = record(value, ["name", "type", "key"], "entity.field");
    return Object.freeze({ name: line(row.name), type: line(row.type), key: choice(row.key, ["none", "primary", "foreign", "primary-foreign"], "entity.field.key") });
  })) }) };
}
