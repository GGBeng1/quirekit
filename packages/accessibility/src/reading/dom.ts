import type { QuireAccessibilityLabels } from "../types";
import type { ReadingAncestor, ReadingItem, ReadingRun } from "./types";

/**
 * Builds native structural HTML from bounded facts, never from feature-provided markup.
 * @param host - Reading content host owned by the current mount.
 * @param items - Current bounded segment.
 * @param labels - Localized labels.
 * @param edit - Exact current-segment activation callback.
 */
export function renderReadingItems(host: HTMLElement, items: readonly ReadingItem[], labels: QuireAccessibilityLabels,
  edit: (index: number) => void): void {
  const doc = host.ownerDocument;
  const fragment = doc.createDocumentFragment();
  let path: Array<{ from: number; element: HTMLElement }> = [];
  items.forEach((item, index) => {
    let common = 0;
    while (common < path.length && path[common]!.from === item.ancestors[common]?.from) common++;
    path = path.slice(0, common);
    for (let depth = common; depth < item.ancestors.length; depth++) {
      const ancestor = item.ancestors[depth]!;
      const element = containerElement(doc, ancestor, item.ancestors[depth - 1]);
      (path.at(-1)?.element ?? fragment).append(element);
      path.push({ from: ancestor.from, element });
    }
    const wrapper = doc.createElement("div");
    const description = item.description;
    const level = description.kind === "heading" ? description.level : undefined;
    const heading = Number.isInteger(level) && level! >= 1 && level! <= 6;
    const text = doc.createElement(heading ? `h${level}` : description.kind === "code-block" ? "pre"
      : description.kind === "separator" ? "hr" : "p");
    if (description.kind !== "separator") {
      if (item.continued) text.append(doc.createTextNode(labels.continuation));
      if (item.runs.length) item.runs.forEach((run) => text.append(inlineElement(doc, run)));
      else text.append(doc.createTextNode(item.text || labels.empty));
    }
    wrapper.append(text);
    if (item.editable) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = labels.edit;
      button.addEventListener("click", () => edit(index));
      wrapper.append(button);
    }
    (path.at(-1)?.element ?? fragment).append(wrapper);
  });
  host.replaceChildren(fragment);
}

/** @param doc - Mounted DOM owner. @param ancestor - Native container facts. @param parent - Parent list facts. @returns Native structural element. */
function containerElement(doc: Document, ancestor: ReadingAncestor, parent: ReadingAncestor | undefined): HTMLElement {
  const { description } = ancestor;
  const element = doc.createElement(description.kind === "list" ? description.ordered ? "ol" : "ul"
    : description.kind === "list-item" ? "li" : description.kind === "blockquote" ? "blockquote" : "div");
  if (element.tagName === "OL") (element as HTMLOListElement).start = listStart(description.start);
  if (description.kind === "list-item") {
    element.setAttribute("aria-posinset", String(ancestor.index));
    element.setAttribute("aria-setsize", String(ancestor.total));
    if (parent?.description.ordered) (element as HTMLLIElement).value = listStart(parent.description.start) + ancestor.index - 1;
  }
  return element;
}

/** @param value - Contributed list start. @returns Safe native integer start. */
function listStart(value: number | undefined): number { return Number.isSafeInteger(value) ? value! : 1; }

/** @param doc - Mounted DOM owner. @param run - Bounded inline content. @returns Native mark elements and exact text. */
function inlineElement(doc: Document, run: ReadingRun): globalThis.Node {
  let content: globalThis.Node = doc.createTextNode(run.text);
  for (const mark of [...run.marks].reverse()) {
    const tags = { strong: "strong", emphasis: "em", underline: "u", strike: "s", code: "code", link: "a" } as const;
    if (mark.kind === "link" && !safeHref(mark.href)) continue;
    const tag = tags[mark.kind];
    if (!tag) continue;
    const element = doc.createElement(tag);
    if (mark.kind === "link") { element.setAttribute("href", mark.href!); element.setAttribute("rel", "noopener noreferrer"); }
    element.append(content);
    content = element;
  }
  return content;
}

/** @param href - Untrusted contributed target. @returns Whether an explicitly activated native link is safe. */
function safeHref(href: string | undefined): boolean {
  if (!href || href.length > 2048 || /[\s\u0000-\u0020\u007f-\u009f\\]/u.test(href)) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/iu.exec(href)?.[1]?.toLowerCase();
  return !scheme || ["http", "https", "mailto", "tel"].includes(scheme);
}
