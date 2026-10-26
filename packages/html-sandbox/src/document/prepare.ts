import { parse, parseFragment, serialize, type DefaultTreeAdapterTypes } from "parse5";
import { GUEST_CSP } from "../policy/csp";
import { guestBootstrap } from "../protocol/guest";

type Element = DefaultTreeAdapterTypes.Element;
/** Check declarative resources before any browser document exists.
 * @param element - Inert parsed node.
 */
function inspect(element: Element): void {
  if (["base", "iframe", "frame", "frameset", "object", "embed", "link"].includes(element.tagName)) throw new Error("sandbox.unsupported-element");
  for (const attr of element.attrs) {
    if (attr.name === "http-equiv" && attr.value.toLowerCase() === "refresh") throw new Error("sandbox.unsupported-navigation");
    if (attr.name === "srcdoc" || attr.name === "srcset" || attr.name === "ping") throw new Error("sandbox.unsupported-resource");
    if (["src", "poster", "background"].includes(attr.name)) {
      if (!((element.tagName === "img" || attr.name === "poster") && /^data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml)[;,]/i.test(attr.value.trim()))) throw new Error("sandbox.unsupported-resource");
    }
  }
}
/** Parse without DOM side effects and prepend policy before every author script.
 * @param html - Validated source snapshot. @param runId - Fresh run identifier. @returns Derived document only; source is unchanged.
 */
export function prepareDocument(html: string, runId: number): string {
  const document = parse(html, { scriptingEnabled: true });
  const nodes: DefaultTreeAdapterTypes.Node[] = [...document.childNodes];
  const root = document.childNodes.find(node => "tagName" in node && node.tagName === "html") as Element | undefined;
  const head = root?.childNodes.find(node => "tagName" in node && node.tagName === "head") as Element | undefined;
  while (nodes.length) {
    const node = nodes.pop()!;
    if ("tagName" in node) {
      inspect(node);
      if (node.tagName === "template" && "content" in node) nodes.push(...node.content.childNodes);
    }
    if ("childNodes" in node) nodes.push(...node.childNodes);
  }
  if (!head) throw new Error("sandbox.invalid-document");
  // Parse trusted bootstrap separately. User source is never interpolated into JS.
  const bootstrap = parseFragment(`<meta http-equiv="Content-Security-Policy" content="${GUEST_CSP}"><meta name="referrer" content="no-referrer"><script>(${guestBootstrap.toString()})(${runId});</script>`);
  for (const node of bootstrap.childNodes) node.parentNode = head;
  head.childNodes.unshift(...bootstrap.childNodes);
  return serialize(document);
}
