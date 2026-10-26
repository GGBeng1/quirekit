import type { QuireKitTagsInputInvalidDetails } from "../../components/tags-input";
import type { TagsPasteContext, TagsPastePolicy } from "./types";

/**
 * Rejects an overflowing batch before the input state commits or clears it.
 * Accepted batches continue through the regular validation and announcement path.
 * @param event - Native input event after clipboard insertion.
 * @param context - Current public tag state and draft operation.
 * @param policy - Current quantity and normalization rules.
 * @param onInvalid - Reports the rejected batch with visible recovery guidance.
 */
export function guardTagsPasteLimit(
  event: Event,
  context: TagsPasteContext,
  policy: TagsPastePolicy,
  onInvalid: (details: QuireKitTagsInputInvalidDetails) => void
): void {
  if (!(event instanceof InputEvent) || event.inputType !== "insertFromPaste"
    || !policy.addOnPaste || policy.allowOverflow || !Number.isFinite(policy.max)) return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const normalize = policy.sanitizeValue ?? ((value: string) => value.trim());
  const candidates = normalize(input.value).split(policy.delimiter).map(normalize);
  const merged = context.value.concat(candidates);
  const count = policy.allowDuplicates ? merged.length : new Set(merged).size;
  if (count <= policy.max) return;

  // Keep the committed collection untouched and the full draft available to repair.
  event.stopImmediatePropagation();
  context.setInputValue(input.value);
  onInvalid({ reason: "rangeOverflow" });
}
