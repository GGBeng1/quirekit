import {
  Fragment,
  type DOMOutputSpec,
  type Mark,
  type Node as ProseMirrorNode
} from "@quirekit/pm";

/**
 * Serializes a PM fragment to HTML without a DOM implementation.
 *
 * @param fragment - Fragment to serialize.
 * @returns Escaped HTML string.
 */
export function serializeFragmentToHtmlString(fragment: Fragment): string {
  let html = "";

  fragment.forEach((node) => {
    html += serializeNodeToHtmlString(node);
  });

  return html;
}

/**
 * Serializes a PM node to HTML without a DOM implementation.
 *
 * @param node - Node to serialize.
 * @returns Escaped HTML string.
 */
function serializeNodeToHtmlString(node: ProseMirrorNode): string {
  if (node.isText) {
    return wrapHtmlInMarks(escapeHtml(node.text ?? ""), node.marks);
  }

  const innerHtml = serializeFragmentToHtmlString(node.content);
  const outputSpec = node.type.spec.toDOM?.(node);

  return outputSpec
    ? serializeOutputSpec(outputSpec, innerHtml) ?? innerHtml
    : innerHtml;
}

/**
 * Wraps HTML text in semantic mark tags.
 *
 * @param html - Escaped text HTML.
 * @param marks - Marks that should wrap the text.
 * @returns HTML wrapped in supported mark tags.
 */
function wrapHtmlInMarks(html: string, marks: readonly Mark[]): string {
  let wrapped = html;

  for (let index = marks.length - 1; index >= 0; index -= 1) {
    const mark = marks[index];

    if (!mark) {
      continue;
    }

    const outputSpec = mark.type.spec.toDOM?.(mark, true);

    if (outputSpec) {
      wrapped = serializeOutputSpec(outputSpec, wrapped) ?? wrapped;
    }
  }

  return wrapped;
}

/**
 * Serializes one schema DOM output spec without requiring a browser DOM.
 *
 * @param outputSpec - DOM output spec returned by node or mark specs.
 * @param contentHtml - Serialized child content inserted at the content hole.
 * @returns Semantic HTML, or null for DOM-owned output that cannot be inspected.
 */
function serializeOutputSpec(
  outputSpec: DOMOutputSpec,
  contentHtml: string
): string | null {
  if (typeof outputSpec === "string") {
    return escapeHtml(outputSpec);
  }
  if (!Array.isArray(outputSpec) || typeof outputSpec[0] !== "string") {
    return null;
  }
  const tagName = outputSpec[0].split(" ").pop()?.toLowerCase();

  if (!tagName || !/^[a-z][\w-]*$/.test(tagName)) {
    return null;
  }
  const attributes = isOutputSpecAttributes(outputSpec[1]) ? outputSpec[1] : null;
  const childStart = attributes ? 2 : 1;
  let children = "";

  for (let index = childStart; index < outputSpec.length; index += 1) {
    const child = outputSpec[index];

    if (child === 0) {
      children += contentHtml;
    } else if (child !== undefined) {
      children += serializeOutputSpec(child as DOMOutputSpec, contentHtml) ?? "";
    }
  }

  return `<${tagName}${serializeOutputSpecAttributes(attributes)}>${children}</${tagName}>`;
}

/**
 * Checks whether an output-spec value is an attribute map.
 *
 * @param value - Candidate output-spec value.
 * @returns Whether the value is a plain attribute map.
 */
function isOutputSpecAttributes(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    !("nodeType" in value);
}

/**
 * Serializes safe schema-owned HTML attributes.
 *
 * @param attributes - Attribute map, or null when absent.
 * @returns Escaped HTML attribute suffix.
 */
function serializeOutputSpecAttributes(
  attributes: Record<string, unknown> | null
): string {
  if (!attributes) {
    return "";
  }

  return Object.entries(attributes)
    .filter(([name, value]) => /^[a-z_:][\w:.-]*$/i.test(name) &&
      !/^on/i.test(name) && value !== null && value !== undefined && value !== false)
    .map(([name, value]) => value === true
      ? ` ${name}`
      : ` ${name}="${escapeHtml(String(value))}"`)
    .join("");
}

/**
 * Escapes HTML text.
 *
 * @param value - Raw text.
 * @returns Escaped HTML text.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
