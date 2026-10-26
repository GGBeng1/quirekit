import type {
  ClassicEditorLocale,
  ClassicEditorTaskRecord
} from "../../../types";
import {
  taskMessage,
  type ClassicEditorTaskMessageKey
} from "./localization";

/**
 * Resolves the localized object or operation label for one task.
 *
 * @param task - Immutable task state.
 * @param locale - Current product locale.
 * @returns Redacted workflow label.
 */
export function resolveTaskLabel(
  task: ClassicEditorTaskRecord,
  locale: ClassicEditorLocale
): string {
  if (task.label !== null) return task.label;
  if (task.creationKind !== null) return taskMessage(locale, task.creationKind);
  if (task.kind === "host") {
    return task.hostPurpose === null
      ? taskMessage(locale, "host")
      : taskMessage(locale, purposeMessage(task.hostPurpose));
  }
  return taskMessage(locale, task.kind);
}

/**
 * Resolves one concise phase sentence.
 *
 * @param task - Immutable task state.
 * @param locale - Current product locale.
 * @returns Localized phase description.
 */
export function resolveTaskStatus(
  task: ClassicEditorTaskRecord,
  locale: ClassicEditorLocale
): string {
  return taskMessage(locale, task.phase);
}

/**
 * Maps Host purpose to a safe existing product label.
 *
 * @param purpose - Closed Host policy purpose.
 * @returns Task message key.
 */
function purposeMessage(
  purpose: NonNullable<ClassicEditorTaskRecord["hostPurpose"]>
): ClassicEditorTaskMessageKey {
  switch (purpose) {
    case "image": return "image";
    case "attachment": return "attachment";
    case "markdown": return "import";
    case "provider-import": return "import";
    case "external-open": return "host";
  }
}
