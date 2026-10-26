import { escapeHtml } from "./format";

/**
 * Renders a standard panel section.
 *
 * @param title - Section title.
 * @param body - Body fragments.
 * @param modifier - Optional extra section class.
 * @returns HTML string for the section.
 */
export function renderSection(
  title: string,
  body: readonly string[],
  modifier = ""
): string {
  const className = modifier
    ? `qk-devtools__section ${modifier}`
    : "qk-devtools__section";

  return [
    `<section class="${className}">`,
    `<h3>${escapeHtml(title)}</h3>`,
    ...body,
    "</section>"
  ].join("");
}

/**
 * Renders a key/value row.
 *
 * @param label - Row label.
 * @param value - Row value.
 * @returns HTML string for the row.
 */
export function renderKeyValue(label: string, value: string): string {
  return [
    "<p class=\"qk-devtools__kv\">",
    `<strong>${escapeHtml(label)}</strong>`,
    `<span>${escapeHtml(value)}</span>`,
    "</p>"
  ].join("");
}
