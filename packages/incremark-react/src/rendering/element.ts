import { Children, createElement as h } from "react";
import type { ReactNode } from "react";
import type { SyntaxNode } from "@lezer/common";
import type { MarkdownLocale } from "@quirekit/incremark-core";
import type { MarkdownComponents, MarkdownComponentProps } from "../types";
import { Source } from "./source";

/** @param attributes - Sanitized semantic properties. @returns React DOM spelling, with no internal source metadata. */
function domProperties(attributes: Record<string, unknown>): Record<string, unknown> {
  const result = { ...attributes };
  for (const key of ["code", "language", "node"]) delete result[key];
  if (result.class !== undefined) { result.className = result.class; delete result.class; }
  if (result.style && typeof result.style === "object") result.style = Object.fromEntries(Object.entries(result.style).map(([key, value]) => [key.replace(/-([a-z])/gu, (_match, letter: string) => letter.toUpperCase()), value]));
  if (result.checked !== undefined) result.readOnly = true;
  return result;
}

/** @param components - Trusted local overrides. @param node - Canonical source owner. @param tag - Semantic tag.
 * @param attributes - Validated properties. @param children - Projected content. @param locale - Control language.
 * @returns A native element or registered component, without raw HTML or template execution. */
export function renderElement(components: MarkdownComponents | undefined, node: SyntaxNode, tag: string,
  attributes: Record<string, unknown> = {}, children?: ReactNode, locale?: MarkdownLocale): ReactNode {
  const component = components?.[tag];
  if (component && typeof component !== "string") {
    const props = { ...attributes, node: Object.freeze({ type: node.name, from: node.from, to: node.to }) } as MarkdownComponentProps;
    return h(component, props, Children.toArray(children));
  }
  if (!component && tag === "pre" && typeof attributes.code === "string") return h(Source, { code: attributes.code, language: String(attributes.language ?? "text"), locale });
  const props = domProperties(attributes), native = component ?? tag;
  if (["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"].includes(native)) return h(native, props);
  return h(native, props, Children.toArray(children));
}
