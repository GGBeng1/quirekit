// Explicit target and trigger validation fail closed at controller boundaries.
import type { SuggestionTarget, SuggestionTrigger } from "./types";

/**
 * Validates a trigger/text pairing without guessing from typed query content.
 *
 * @param trigger - Explicit trigger family and committed text.
 */
export function validateSuggestionTrigger(trigger: SuggestionTrigger): void {
  const expected = trigger.kind === "slash"
    ? "/"
    : trigger.kind === "mention" ? "@" : ":";
  if (trigger.text !== expected) {
    throw new RangeError(
      `Suggestion trigger ${trigger.kind} must use "${expected}".`
    );
  }
}

/**
 * Validates stable target identity and monotonic generation facts.
 *
 * @param target - Explicit feature bookmark and generation.
 */
export function validateSuggestionTarget<Bookmark>(
  target: SuggestionTarget<Bookmark>
): void {
  if (target.id.trim().length === 0) {
    throw new RangeError("Suggestion target ids must not be empty.");
  }
  if (!Number.isInteger(target.generation) || target.generation < 0) {
    throw new RangeError(
      "Suggestion target generations must be nonnegative integers."
    );
  }
}
