import { v4 as uuid } from "uuid";

/**
 * Clones a mounted visual without listeners, duplicate identities or active embeds.
 * @param source - Actual mounted source, never serialized document content.
 * @returns Inert DOM carrying the source's presentation.
 */
export function cloneBlockPresentation(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  const prefix = `block-drag-${uuid()}`;
  const ids = new Map<string, string>();
  for (const element of copies) {
    if (element.id) { const next = `${prefix}-${ids.size}`; ids.set(element.id, next); element.id = next; }
    element.removeAttribute("contenteditable"); element.removeAttribute("autofocus");
    element.removeAttribute("data-selected");
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
  }
  // Repair only local references; external sources and canonical document links
  // remain untouched. New SVG ids preserve masks/gradients without shadowing source ids.
  for (const element of copies) {
    for (const attribute of Array.from(element.attributes)) {
      let value = attribute.value.replace(/url\(#([^)]*)\)/g, (match, id: string) => ids.has(id) ? `url(#${ids.get(id)})` : match);
      if ((attribute.name === "href" || attribute.name === "xlink:href") && value.startsWith("#") && ids.has(value.slice(1))) value = `#${ids.get(value.slice(1))}`;
      if (attribute.name.startsWith("aria-") || attribute.name === "for") value = value.split(" ").map(id => ids.get(id) ?? id).join(" ");
      if (value !== attribute.value) element.setAttribute(attribute.name, value);
    }
  }
  for (let index = 0; index < originals.length; index++) {
    const original = originals[index]!, copy = copies[index]!;
    if (original.tagName === "CANVAS" && (original as HTMLCanvasElement).width && (original as HTMLCanvasElement).height) {
      (copy as HTMLCanvasElement).getContext("2d")?.drawImage(original as HTMLCanvasElement, 0, 0);
    } else if (["IFRAME", "OBJECT", "EMBED", "VIDEO", "AUDIO"].includes(original.tagName)) {
      replaceActiveSurface(original as HTMLElement, copy);
    }
  }
  return clone;
}

/**
 * Retains media geometry without starting another player or navigating an iframe.
 * @param source - Live media surface.
 * @param copy - Detached clone to replace before it reaches the document.
 */
function replaceActiveSurface(source: HTMLElement, copy: Element): void {
  const rect = source.getBoundingClientRect();
  const canvas = source.ownerDocument.createElement("canvas");
  canvas.width = Math.ceil(rect.width); canvas.height = Math.ceil(rect.height);
  Object.assign(canvas.style, { display: rect.height ? "block" : "none", width: `${rect.width}px`, height: `${rect.height}px`, maxWidth: "100%" });
  if (source.tagName === "VIDEO" && (source as HTMLVideoElement).readyState >= 2) {
    canvas.getContext("2d")?.drawImage(source as HTMLVideoElement, 0, 0, canvas.width, canvas.height);
  } else if (source.tagName === "VIDEO" && (source as HTMLVideoElement).poster) {
    const image = source.ownerDocument.createElement("img"); image.src = (source as HTMLVideoElement).poster;
    image.style.cssText = canvas.style.cssText; image.style.objectFit = "contain"; copy.replaceWith(image); return;
  } else if (rect.width && rect.height) {
    const context = canvas.getContext("2d"), style = getComputedStyle(source);
    if (context) {
      context.fillStyle = style.color; context.font = "14px sans-serif"; context.textAlign = "center";
      context.fillText(source.title || "嵌入内容", rect.width / 2, rect.height / 2);
    }
  }
  copy.replaceWith(canvas);
}
