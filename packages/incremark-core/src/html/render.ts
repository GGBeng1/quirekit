import type { Element, RootContent } from "hast";
import type { SyntaxNode } from "@lezer/common";
import { fromHtml } from "hast-util-from-html";
import { sanitize, defaultSchema } from "hast-util-sanitize";
import { isSafeDestination } from "@quirekit/msfe-core";
import type { ReadingContext } from "../reading/types";
import { completeHtmlLength } from "./parse";
import { protectMarkdown } from "./inline";
import { markdownMessages } from "../reading/messages";
import { safeInlineStructure } from "./phrasing";
import { safeInlineStyles } from "./styles";

/** @param node - Sanitized subtree. @returns Decoded literal content for code copying. */
function plainText(node: RootContent): string {
  return node.type === "text" ? node.value : node.type === "element" ? node.children.map(plainText).join("") : "";
}

/** @param context - Captured reading policy. @param node - Canonical source owner. @param source - Complete HTML island.
 * @param offset - Island start in canonical source. @param text - Optional inline Markdown child projection.
 * @returns Sanitized native/component nodes with no innerHTML or template evaluation. */
function project<Output>(context: ReadingContext<Output>, node: SyntaxNode, source: string, offset: number,
  text?: (from: number, to: number) => Output): Output {
  const prefix = `${context.prefix}-html-`;
  const policy = typeof context.options.html === "object" ? context.options.html : {};
  const tree = sanitize(fromHtml(source, { fragment: true }), { ...defaultSchema, clobberPrefix: prefix,
    ...(policy.styles === "safe" ? { attributes: { ...defaultSchema.attributes, "*": [...defaultSchema.attributes!["*"]!, "style"] } } : {}),
  });
  if (text && tree.type === "root" && !safeInlineStructure(tree.children, node)) return context.adapter.text(context.state.sliceDoc(offset, offset + source.length));
  /** @param element - Sanitized HTML element. @returns framework properties with the shared URL policy applied last. */
  function attributes(element: Element): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(element.properties)) {
      if (key === "style") {
        const style = policy.styles === "safe" ? safeInlineStyles(value) : undefined;
        if (style) props.style = style;
        continue;
      }
      const name = key === "className" ? "class" : /^(?:aria|data)[A-Z]/u.test(key)
        ? key.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`) : key;
      props[name] = Array.isArray(value) ? value.join(" ") : value;
    }
    for (const field of ["href", "src"] as const) {
      const value = props[field];
      if (typeof value !== "string") continue;
      const accepted = isSafeDestination(value, field === "src")
        && (field === "href" ? policy.allowLink?.(value) : policy.allowImage?.(value)) !== false;
      if (!accepted) delete props[field];
      else if (field === "href" && value.startsWith("#")) props[field] = `#${prefix}${value.slice(1)}`;
    }
    return props;
  }
  /** @param child - Sanitizer output only. @param literal - HTML code preserves its text syntax. @returns Escaped text or a constrained element tree. */
  function render(child: RootContent, literal = false): Output {
    if (child.type === "text") {
      const from = child.position?.start.offset, to = child.position?.end.offset;
      if (!text || from === undefined || to === undefined) return context.adapter.text(child.value);
      if (!literal) return text(offset + from, offset + to);
      // Restore original text under HTML code after the offset-preserving Markdown
      // shield. Only HTML entities decode here; Markdown delimiters stay literal.
      const raw = context.state.sliceDoc(offset + from, offset + to).replace(/</gu, "&lt;");
      return context.adapter.text(fromHtml(raw, { fragment: true }).children.map(plainText).join(""));
    }
    if (child.type !== "element") return context.adapter.fragment([]);
    const children = child.children.map(value => render(value, literal || child.tagName === "code" || child.tagName === "pre"));
    if (policy.allowedElements && !policy.allowedElements.includes(child.tagName)) return context.adapter.fragment(children);
    const props = attributes(child);
    if (child.tagName === "img" && !props.src) return context.adapter.text(String(props.alt ?? ""));
    if (child.tagName === "pre") {
      const code = child.children.find(value => value.type === "element" && value.tagName === "code");
      const language = code?.type === "element" ? code.properties.className?.toString().match(/(?:^|[, ])language-([^, ]+)/u)?.[1] : undefined;
      Object.assign(props, { code: plainText(child), language: language ?? markdownMessages[context.locale].plain });
    }
    return context.element(node, child.tagName, props, context.adapter.fragment(children));
  }
  return tree.type === "root" ? context.adapter.fragment(tree.children.map(child => render(child))) : render(tree as RootContent);
}

/** @param context - Accepted Markdown snapshot. @param node - Markdown-confirmed HTMLBlock.
 * @returns A safe complete island, or exact source when the candidate is incomplete/oversized. */
export function renderHtmlBlock<Output>(context: ReadingContext<Output>, node: SyntaxNode): Output {
  const source = context.state.sliceDoc(node.from, node.to);
  if (!completeHtmlLength(source, false)) return context.adapter.text(source);
  try { return project(context, node, source, node.from); }
  catch (cause) { context.report({ owner: "html", phase: "render", from: node.from, to: node.to, cause }); return context.adapter.text(source); }
}

/** @param context - Accepted source and rendering policy. @param parent - Inline Markdown owner. @param node - Opening HTMLTag.
 * @param to - Bound of this inline projection. @param text - Projection of Markdown children inside HTML text.
 * @returns Consumed source boundary and safe nodes, or undefined while incomplete. */
export function renderHtmlInline<Output>(context: ReadingContext<Output>, parent: SyntaxNode, node: SyntaxNode, to: number,
  text: (from: number, to: number) => Output): { to: number; output: Output } | undefined {
  const source = protectMarkdown(parent, node.from, context.state.sliceDoc(node.from, to));
  const length = completeHtmlLength(source, true);
  if (!length) return undefined;
  try { return { to: node.from + length, output: project(context, parent, source.slice(0, length), node.from, text) }; }
  catch (cause) { context.report({ owner: "html", phase: "render", from: node.from, to: node.from + length, cause }); return undefined; }
}
