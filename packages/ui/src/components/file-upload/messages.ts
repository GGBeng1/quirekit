import { quireKitDefaultLocale } from '../../locale/resolve';
import type { Messages as QuireKitFileUploadMessages } from '../../locale/components/file-upload';

/** Formats public validation codes without dropping custom validation messages.
 * @param errors - Current file's validation codes.
 * @param messages - FileUpload text of the active language; defaults to Chinese.
 * @returns Deduplicated readable feedback.
 */
export function getQuireKitFileUploadErrorMessage(errors: readonly string[], messages: QuireKitFileUploadMessages = quireKitDefaultLocale.messages.fileUpload): string {
  return [...new Set(errors.map(error => messages.errors[error] ?? error))].join(messages.errorSeparator);
}
