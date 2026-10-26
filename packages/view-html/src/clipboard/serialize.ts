import { writeQuireClipboardSelection } from "@quirekit/clipboard";
import type { QuireClipboardOutputStrategy } from "@quirekit/view/mounted-backend";
import type {
  CreateHtmlClipboardOutputStrategyOptions
} from "./types";

/**
 * Creates the HTML backend's schema-owned clipboard output strategy.
 *
 * @param options - Browser document realm used for detached schema DOM.
 * @returns Internal output strategy consumed by the shared copy/cut controller.
 */
export function createHtmlClipboardOutputStrategy(
  options: CreateHtmlClipboardOutputStrategyOptions
): QuireClipboardOutputStrategy {
  return ({ editor, clipboardData }) => writeQuireClipboardSelection({
    editor,
    clipboardData,
    ownerDocument: options.ownerDocument
  });
}
