import type {
  ComputedRef,
  Ref
} from "vue";
import type {
  ClassicEditorFontHubMessageKey,
  ClassicEditorFontLibrary,
  ClassicEditorWebFontFamily
} from "@classic/types";
import { createClassicFontHubFamilyKey } from "./family-key";

/**
 * Creates source-neutral async operations over one font Hub state instance.
 *
 * @param options - Reactive library, source, import, feedback, and copy bindings.
 * @returns Search, import, and removal operations.
 */
export function createClassicFontHubOperations(options: {
  readonly library: ComputedRef<ClassicEditorFontLibrary | undefined>;
  readonly pendingFamilies: Ref<ReadonlySet<string>>;
  readonly previewingFamilies: Ref<ReadonlySet<string>>;
  readonly downloadOnImport: Ref<boolean>;
  readonly feedback: Ref<string>;
  readonly feedbackTone: Ref<"error" | "success">;
  readonly revision: Ref<number>;
  readonly message: (key: ClassicEditorFontHubMessageKey) => string;
}) {
  /**
   * Loads one real family into the browser without creating an import record.
   *
   * @param family - Exact provider family selected for visual preview.
   * @returns Completion after preview registration or visible failure feedback.
   */
  async function previewFont(family: ClassicEditorWebFontFamily): Promise<void> {
    const library = options.library.value;
    const key = createClassicFontHubFamilyKey(family);
    if (library === undefined || options.previewingFamilies.value.has(key)) return;
    addPendingFamily(options.previewingFamilies, key);
    options.feedback.value = "";
    try {
      await library.previewFamily(family);
      options.revision.value += 1;
    } catch (error) {
      options.feedbackTone.value = "error";
      options.feedback.value = `${options.message("previewFontFailed")}：${toErrorMessage(error)}`;
    } finally {
      removePendingFamily(options.previewingFamilies, key);
    }
  }

  /**
   * Imports one family into local product state and optionally caches its bytes.
   *
   * @param family - Provider or recommendation result.
   * @param announce - Whether one successful import should replace visible feedback.
   * @returns Whether the family was imported successfully.
   */
  async function importFont(
    family: ClassicEditorWebFontFamily,
    announce = true
  ): Promise<boolean> {
    const library = options.library.value;
    const key = createClassicFontHubFamilyKey(family);
    if (library === undefined || options.pendingFamilies.value.has(key)) return false;
    addPendingFamily(options.pendingFamilies, key);
    options.feedback.value = "";
    try {
      await library.importFamily(family, options.downloadOnImport.value);
      if (announce) {
        options.feedbackTone.value = "success";
        options.feedback.value = `“${family.family}” ${options.message("imported")}`;
      }
      options.revision.value += 1;
      return true;
    } catch (error) {
      options.feedbackTone.value = "error";
      options.feedback.value = `${options.message("fontAddFailed")}：${toErrorMessage(error)}`;
      return false;
    } finally {
      removePendingFamily(options.pendingFamilies, key);
    }
  }

  /**
   * Removes one imported family and its product-owned cached bytes.
   *
   * @param family - Exact imported family record.
   * @returns Whether removal succeeded; false keeps the confirmation open for retry.
   */
  async function removeFont(family: ClassicEditorWebFontFamily): Promise<boolean> {
    const key = createClassicFontHubFamilyKey(family);
    const library = options.library.value;
    if (!library || options.pendingFamilies.value.has(key)) return false;
    addPendingFamily(options.pendingFamilies, key);
    options.feedback.value = "";
    try {
      await library.removeFamily(family);
      options.revision.value += 1;
      return true;
    } catch (error) {
      options.feedbackTone.value = "error";
      options.feedback.value = toErrorMessage(error);
      return false;
    } finally {
      removePendingFamily(options.pendingFamilies, key);
    }
  }

  return { importFont, previewFont, removeFont };
}

/**
 * Adds one family to the immutable pending-state snapshot.
 *
 * @param pendingFamilies - Reactive pending-family set.
 * @param family - Exact family entering an asynchronous operation.
 */
function addPendingFamily(
  pendingFamilies: Ref<ReadonlySet<string>>,
  family: string
): void {
  pendingFamilies.value = new Set([...pendingFamilies.value, family]);
}

/**
 * Removes one family from the immutable pending-state snapshot.
 *
 * @param pendingFamilies - Reactive pending-family set.
 * @param family - Exact family completing an asynchronous operation.
 */
function removePendingFamily(
  pendingFamilies: Ref<ReadonlySet<string>>,
  family: string
): void {
  const next = new Set(pendingFamilies.value);
  next.delete(family);
  pendingFamilies.value = next;
}

/**
 * Converts an unknown thrown value into visible diagnostic text.
 *
 * @param error - Unknown provider or persistence failure.
 * @returns Stable error message.
 */
function toErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const messages: string[] = [];
  const visited = new Set<Error>();
  let current: Error | undefined = error;
  while (current !== undefined && !visited.has(current)) {
    visited.add(current);
    if (current.message && !messages.includes(current.message)) {
      messages.push(current.message);
    }
    current = current.cause instanceof Error ? current.cause : undefined;
  }
  return messages.join("；原因：");
}
