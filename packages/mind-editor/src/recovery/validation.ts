import { applyMindMapContent, readMindMapDocument, type MindMapContentUpdate, type MindMapDocument } from "@quirekit/mind-map";
import { MindMapRecoveryError } from "./errors";

/** @param input - Untrusted object. @param keys - Admitted fields. @returns Plain own data without accessors. */
export function recoveryObject(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new MindMapRecoveryError("draftFormat");
  for (const key of Reflect.ownKeys(input)) if (typeof key !== "string" || !keys.includes(key)
    || !Object.hasOwn(Object.getOwnPropertyDescriptor(input, key)!, "value")) throw new MindMapRecoveryError("draftFormat");
  return input as Record<string, unknown>;
}
/** @param value - Unfinished plain input. @returns Original bounded literal string. */
function text(value: unknown): string {
  if (typeof value !== "string" || value.length > 10000) throw new MindMapRecoveryError("draftFormat");
  return value;
}
/** @param source - Strict canonical baseline. @param value - Untrusted pending fields.
 * @returns Detached fields retaining unfinished text, with shape and identity references admitted separately. */
export function readRecoveryContent(source: MindMapDocument, value: unknown): MindMapContentUpdate {
  const input = recoveryObject(value, ["details", "annotations"]);
  if (input.details !== undefined && (!Array.isArray(input.details) || input.details.length > 10000)) throw new MindMapRecoveryError("draftFormat");
  if (input.annotations !== undefined && (!Array.isArray(input.annotations) || input.annotations.length > 500)) throw new MindMapRecoveryError("draftFormat");
  const normalized: MindMapContentUpdate = {
    ...(input.details === undefined ? {} : { details: (input.details as unknown[]).map(raw => {
      const entry = recoveryObject(raw, ["ids", "patch"]);
      if (!Array.isArray(entry.ids) || !entry.ids.length || entry.ids.length > 10000 || entry.ids.some(id => typeof id !== "string")) throw new MindMapRecoveryError("draftFormat");
      const patch = entry.patch === null ? null : { ...recoveryObject(entry.patch, ["link", "note", "marker", "image"]) };
      if (patch?.link !== undefined && patch.link !== null) { text(patch.link); patch.link = "https://example.com/"; }
      return { ids: entry.ids as string[], patch };
    }) }),
    ...(input.annotations === undefined ? {} : { annotations: (input.annotations as unknown[]).map(raw => {
      const annotation = { ...recoveryObject(raw, ["id", "kind", "text", "color", "from", "to", "topicIds"]) };
      text(annotation.text); annotation.text = "";
      if (annotation.color !== undefined) { text(annotation.color); annotation.color = "#4855ec"; }
      return annotation as unknown as NonNullable<MindMapContentUpdate["annotations"]>[number];
    }) }),
  };
  // Unfinished text is a form value, never model authority. Admit all remaining
  // fields/references through the existing model using temporary safe text.
  applyMindMapContent(readMindMapDocument(source), normalized as MindMapContentUpdate);
  return structuredClone(input) as MindMapContentUpdate;
}
