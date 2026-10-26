import type { DOMPurify } from "dompurify";
import { isSafeDestination } from "@quirekit/msfe-core";
import { htmlTags } from "../parse/policy";
import type { HtmlFragment } from "../parse/types";
import type { HtmlOptions, HtmlWork } from "../types";
import type { PreparedHtml } from "./types";

const attributes = ["title", "lang", "dir", "href", "src", "alt", "width", "height", "colspan", "rowspan"];

/**
 * Uses browser sanitization only in the mounted view, then copies a restricted inert description.
 * The resulting DOM is never attached or reserialized into a different parsing context.
 * @param purifier - Owner-window instance with no global hooks.
 * @param source - Original candidate text.
 * @param fragment - Strict source ranges, independently checked before any DOM use.
 * @param options - Host resource restrictions.
 * @param work - Actual bounded work counters.
 * @returns Vetted description or source fallback if browser recovery changed element ownership.
 */
export function prepareHtml(purifier: DOMPurify, source: string, fragment: HtmlFragment, options: HtmlOptions, work: HtmlWork): PreparedHtml | null {
  try {
    work.sanitizations++;
    const clean = purifier.sanitize(source.slice(fragment.from, fragment.to), {
      ALLOWED_TAGS: [...htmlTags], ALLOWED_ATTR: attributes, ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
      SANITIZE_DOM: true, SANITIZE_NAMED_PROPS: true, RETURN_DOM_FRAGMENT: true,
      CUSTOM_ELEMENT_HANDLING: { tagNameCheck: null, attributeNameCheck: null, allowCustomizedBuiltInElements: false },
    });
    const nodes = Array.from(clean.querySelectorAll("*"));
    // HTML inserts tbody when it is omitted. This structural wrapper contains no source
    // text/attributes; all other parser repairs fall back rather than guessing positions.
    const normalized = fragment.elements.some(element => element.tag === "tbody") ? nodes : nodes.filter(node => node.localName !== "tbody");
    if (normalized.length !== fragment.elements.length || !clean.textContent?.trim() && !nodes.some(node => ["img", "br", "hr"].includes(node.localName))) return null;
    const vetted = new Map<number, Readonly<Record<string, string>>>();
    for (let index = 0; index < normalized.length; index++) {
      const node = normalized[index]!, element = fragment.elements[index]!;
      if (node.localName !== element.tag || node.namespaceURI !== "http://www.w3.org/1999/xhtml") return null;
      const value: Record<string, string> = {};
      for (const name of ["title", "lang"]) if (node.hasAttribute(name)) value[name] = node.getAttribute(name)!;
      const dir = node.getAttribute("dir"); if (dir && ["ltr", "rtl", "auto"].includes(dir)) value.dir = dir;
      for (const name of element.tag === "img" ? ["width", "height"] : ["th", "td"].includes(element.tag) ? ["rowspan", "colspan"] : []) {
        const number = node.getAttribute(name);
        if (number && /^\d{1,4}$/u.test(number) && Number(number) > 0 && Number(number) <= 1000) value[name] = number;
      }
      if (element.tag === "a") {
        const href = node.getAttribute("href");
        if (href && isSafeDestination(href) && (options.allowLink?.(href) ?? true)) {
          value.href = href; value.target = "_blank"; value.rel = "noopener noreferrer";
        }
      }
      if (element.tag === "img") {
        const src = node.getAttribute("src");
        if (!src || !isSafeDestination(src) || !["https:", "http:"].includes(new URL(src, "https://msfe.invalid/").protocol)
          || options.allowImage?.(src) !== true) return null;
        value.src = src; value.alt = node.getAttribute("alt") ?? "";
        value.loading = "lazy"; value.referrerpolicy = "no-referrer";
      }
      vetted.set(element.from, value);
    }
    const entities = fragment.entities.flatMap(range => {
      work.sanitizations++;
      const text = purifier.sanitize(source.slice(range.from, range.to), { ALLOWED_TAGS: [], RETURN_DOM_FRAGMENT: true }).textContent ?? "";
      // Control characters must not create hidden line breaks inside an inline replacement.
      return text && !/[\u0000-\u001f\u007f]/u.test(text) ? [{ ...range, text }] : [];
    });
    return { fragment, attributes: vetted, entities };
  } catch { return null; }
}
