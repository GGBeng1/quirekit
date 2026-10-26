import type {} from "@quirekit/accessibility-contract";
import type {} from "@quirekit/ai-contract";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  mergeAttributes
} from "@quirekit/core";
import { createLinkAiCapabilities } from "./ai/facts";
import { linkDocxCodec } from "./docx";
import { normalizeLinkHref } from "./href";
import { createLinkCommands } from "./commands/mark";
import { createLinkPastePlugin } from "./paste/plugin";
import { createLinkTypingPlugin, rememberLinkTypingIntent } from "./input/typing";
import type { LinkOptions, LinkMarkdownToken, LinkCommandMethods } from "./types";
export type { LinkOptions, LinkAttributes, LinkInsertionAttributes } from "./types";
export {
  defaultLinkDisplayTextMaximumLength,
  defaultLinkHrefMaximumLength,
  isAllowedLinkHref,
  normalizeLinkDisplayText,
  normalizeLinkHref
} from "./href";

/** Renderer-neutral hyperlink mark with clipboard recognition and typed editing. */
export const Link = Mark.create<LinkOptions>({
  name: "link",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "mark", name: this.name,
      /** @param mark - Canonical source. @returns Owned native semantics. */
      describe: (mark) => { const href = normalizeLinkHref(mark.attrs.href); return href ? { kind: "link", href } : null; } }];
  },

  addAiCapabilities() {
    return createLinkAiCapabilities(this.name);
  },

  priority: 1000,

  inclusive: false,

  exitable: true,

  keepOnSplit: false,

  addDocx() {
    return linkDocxCodec;
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      color: "#0563c1",
      autolink: true
    };
  },

  addAttributes() {
    return {
      href: { default: null }
    };
  },

  parseHTML() {
    return [{
      tag: "a[href]",
      getAttrs: (element) => {
        const href = normalizeLinkHref(
          (element as HTMLElement).getAttribute("href")
        );
        return href === null ? false : { href };
      }
    }];
  },

  renderHTML({ HTMLAttributes }) {
    const href = normalizeLinkHref(HTMLAttributes.href);
    if (href === null) {
      const fallbackAttributes = mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes
      );
      delete fallbackAttributes.href;
      return ["span", fallbackAttributes, 0];
    }
    return [
      "a",
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        { href }
      ),
      0
    ];
  },

  canvasStyle(this: { readonly options: LinkOptions }) {
    return {
      color: this.options.color,
      textDecoration: ["underline"]
    };
  },

  markdownTokenName: "link",

  parseMarkdown(token, helpers) {
    const linkToken = token as LinkMarkdownToken;
    const content = helpers.parseInline(linkToken.tokens ?? []);
    const href = normalizeLinkHref(linkToken.href);
    return href === null
      ? content
      : helpers.applyMark(this.name, content, { href });
  },

  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node);
    const href = normalizeLinkHref(node.attrs?.href);
    return href === null
      ? content
      : `[${content}](${escapeMarkdownLinkTarget(href)})`;
  },

  /** @returns Clipboard projection and bounded native-input completion. */
  addProseMirrorPlugins() {
    return [createLinkPastePlugin(this.name), ...(this.options.autolink ? [createLinkTypingPlugin(this.name)] : [])];
  },

  /** @returns A non-consuming completion observer before the default Enter command. */
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.editor && this.options.autolink) rememberLinkTypingIntent(this.editor.view, this.name, null);
        return false;
      }
    };
  },

  /** @returns Typed manual insertion, formatting and whole-link editing commands. */
  addCommands() {
    return createLinkCommands(this.name);
  }
});

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the Link extension. */
    readonly link: LinkCommandMethods<ReturnType>;
  }
}

/**
 * Escapes delimiter characters used by inline Markdown link targets.
 *
 * @param href - Validated canonical target.
 * @returns Markdown-safe target token.
 */
function escapeMarkdownLinkTarget(href: string): string {
  return href.replace(/[\\()]/gu, "\\$&");
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(Link.config.canvasStyle!, {
  kind: "document",
  /** @param context - Current configured owner. @returns Live non-document dependencies. */
  getVersion: ({ extension }) => extension?.options.color
});
