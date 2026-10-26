import { Node } from "@quirekit/core";
import { readHtmlSandboxDocument } from "@quirekit/html-sandbox";
import { htmlSandboxCommands } from "./commands";
import { htmlSandboxNodeView } from "./view";
import type { HtmlSandboxOptions } from "./types";
/** Explicit source-backed atom. Static HTML export contains escaped code, never an active frame. */
export const HtmlSandbox = Node.create<HtmlSandboxOptions>({
  name: "htmlSandbox", group: "block", atom: true, selectable: true, draggable: true,
  /** @returns Headless installation until a shell is supplied. */ addOptions() { return { mount: null }; },
  /** @returns Portable source only, with no authorization fields. */ addAttributes() { return { document: { default: null, rendered: false } }; },
  /** @returns Typed commands using the canonical transaction. */ addCommands() { return htmlSandboxCommands(); },
  /** @returns Retained HTML view lifecycle. */ addNodeView() { return props => htmlSandboxNodeView(props, this.options); },
  /** @returns Source-preserving inert HTML import. */ parseHTML() { return [{ tag: "figure[data-qk-html-sandbox-source]",
    /** @param element - Imported inert figure. @returns Validated data or refusal. */
    getAttrs(element) { try { const value=element.getAttribute("data-qk-html-sandbox-source") ?? ""; if (value.length > 2 * 1024 * 1024) return false; return { document: readHtmlSandboxDocument(JSON.parse(value)) }; } catch { return false; } },
  }]; },
  /** @param props - Source node. @returns Escaped static source with a portable envelope. */
  renderHTML({ node }) { const document = readHtmlSandboxDocument(node.attrs.document); return ["figure", { "data-qk-html-sandbox-source": JSON.stringify(document) }, ["pre", {}, ["code", {}, document.html]]]; },
  /** @param props - Source node. @returns Plain source fallback. */ renderText({ node }) { return readHtmlSandboxDocument(node.attrs.document).html; },
});
