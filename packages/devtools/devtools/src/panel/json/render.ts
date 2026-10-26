import {
  collectJsonSearchExpandedPaths,
  matchesJsonQuery
} from "./collect";
import {
  formatContainerPreview,
  formatPrimitive,
  getJsonEntries,
  getJsonNodeType,
  getPrimitiveType,
  isContainer
} from "./shared";
import { escapeAttribute, escapeHtml } from "../format";
import { renderIcon } from "../icons";

/**
 * Renders an inspectable JSON tree.
 *
 * @param value - JSON value to inspect.
 * @param expandedPaths - Expanded container paths.
 * @param search - Search query.
 * @returns HTML string for the tree.
 */
export function renderJsonTree(
  value: unknown,
  expandedPaths: readonly string[],
  search: string
): string {
  const expanded = new Set(expandedPaths);
  const query = search.trim().toLowerCase();
  for (const path of collectJsonSearchExpandedPaths(value, search)) {
    expanded.add(path);
  }

  return [
    "<div class=\"qk-devtools-json-tree\" role=\"tree\">",
    renderJsonNode(value, "root", "$", 0, expanded, query),
    "</div>"
  ].join("");
}

/**
 * Renders a JSON node row and its expanded children.
 *
 * @param value - Current JSON value.
 * @param label - Display label.
 * @param path - Current path.
 * @param depth - Current depth.
 * @param expanded - Expanded path set.
 * @param query - Normalized search query.
 * @returns HTML string for the node.
 */
function renderJsonNode(
  value: unknown,
  label: string,
  path: string,
  depth: number,
  expanded: ReadonlySet<string>,
  query: string
): string {
  const container = isContainer(value);
  const open = container && expanded.has(path);
  const match = query ? matchesJsonQuery(label, value, path, query) : false;
  const row = [
    `<div class="qk-devtools-json-tree__row" role="treeitem" aria-expanded="${container ? String(open) : "false"}" data-match="${match ? "true" : "false"}" style="--qk-json-level:${depth}">`,
    renderToggle(container, path, open),
    `<span class="qk-devtools-json-tree__key">${escapeHtml(label)}</span>`,
    renderValue(value, open),
    "</div>"
  ].join("");

  if (!container || !open) {
    return row;
  }

  return [
    row,
    "<div class=\"qk-devtools-json-tree__children\" role=\"group\">",
    ...getJsonEntries(value).map(([key, child]) => {
      return renderJsonNode(child, key, `${path}.${key}`, depth + 1, expanded, query);
    }),
    "</div>"
  ].join("");
}

/**
 * Renders the expand/collapse affordance for a row.
 *
 * @param container - Whether the row is expandable.
 * @param path - JSON path.
 * @param open - Whether the row is open.
 * @returns HTML string for the toggle.
 */
function renderToggle(container: boolean, path: string, open: boolean): string {
  if (!container) {
    return "<span class=\"qk-devtools-json-tree__spacer\"></span>";
  }

  return [
    "<button type=\"button\" class=\"qk-devtools-json-tree__toggle\" data-qk-devtools-action=\"json-toggle\" ",
    `data-qk-devtools-json-path="${escapeAttribute(path)}" aria-label="${open ? "Collapse" : "Expand"} ${escapeAttribute(path)}">`,
    renderIcon(open ? "chevron-down" : "chevron-right"),
    "</button>"
  ].join("");
}

/**
 * Renders a JSON value preview.
 *
 * @param value - JSON value.
 * @param open - Whether a container value is expanded.
 * @returns HTML string for the value.
 */
function renderValue(value: unknown, open: boolean): string {
  if (isContainer(value)) {
    const nodeType = getJsonNodeType(value);
    const suffix = Array.isArray(value)
      ? open ? "" : " [...]"
      : open ? "" : " {...}";

    return [
      `<span class="qk-devtools-json-tree__meta">${formatContainerPreview(value)}${suffix}</span>`,
      nodeType ? renderNodeTag(nodeType) : ""
    ].join("");
  }

  return `<span class="qk-devtools-json-tree__value qk-devtools-json-tree__value--${getPrimitiveType(value)}">${escapeHtml(formatPrimitive(value))}</span>`;
}

/**
 * Renders a compact node type tag.
 *
 * @param nodeType - ProseMirror-like node type.
 * @returns Node tag HTML.
 */
function renderNodeTag(nodeType: string): string {
  return `<span class="qk-devtools-json-tree__tag">${escapeHtml(nodeType)}</span>`;
}
