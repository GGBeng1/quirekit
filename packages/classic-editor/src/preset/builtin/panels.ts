import {
  resolveBuiltinClassicEditorMessage,
  type BuiltinClassicEditorMessageKey,
  type BuiltinClassicEditorMessageParameters
} from "../../localization";
import type { ClassicEditorRenderContext } from "../../types";
import { resolveClassicEditorTargetStatus } from "../../shell/components/status-bar";
export { renderBuiltinOutline } from "./outline/mount";

/**
 * Renders a minimal read-only document properties panel.
 *
 * @param context - Mounted product context.
 * @returns Definition list of canonical product facts.
 */
export function renderBuiltinProperties(context: ClassicEditorRenderContext): Node {
  const list = context.ownerDocument.createElement("dl");
  list.className = "qk-classic-editor__properties";
  appendProperty(
    list,
    message(context, "editable"),
    context.editor.isEditable
      ? message(context, "yes")
      : message(context, "no")
  );
  return list;
}

/**
 * Renders current semantic target without mislabeling object selections as text.
 *
 * @param context - Mounted product context.
 * @returns Target-aware status element.
 */
export function renderBuiltinSelection(context: ClassicEditorRenderContext): HTMLElement {
  const status = resolveClassicEditorTargetStatus(context);
  const value = context.ownerDocument.createElement("span");
  value.dataset.statusTargetKind = status.kind;
  value.dataset.statusSource = status.source;
  value.textContent = status.text;
  return value;
}

/**
 * Renders current product engine status.
 *
 * @param context - Mounted product context.
 * @returns Product engine status text.
 */
export function renderBuiltinEngineStatus(context: ClassicEditorRenderContext): string {
  return `${context.backend === "canvas" ? "Canvas" : "SVG"} · ${
    message(context, "printLayout")
  }`;
}

/**
 * Appends one term/value pair to a properties list.
 *
 * @param list - Definition list owner.
 * @param term - Property label.
 * @param value - Property value.
 */
function appendProperty(list: HTMLDListElement, term: string, value: string): void {
  const ownerDocument = list.ownerDocument;
  const name = ownerDocument.createElement("dt");
  const description = ownerDocument.createElement("dd");
  name.textContent = term;
  description.textContent = value;
  list.append(name, description);
}

/**
 * Resolves one built-in panel string for the current product locale.
 *
 * @param context - Mounted product context.
 * @param key - Stable built-in message key.
 * @param parameters - Optional named placeholder replacements.
 * @returns Visible localized copy.
 */
function message(
  context: ClassicEditorRenderContext,
  key: BuiltinClassicEditorMessageKey,
  parameters?: BuiltinClassicEditorMessageParameters
): string {
  return resolveBuiltinClassicEditorMessage(context.locale, key, parameters);
}
