import type { QuireAiCapability } from "@quirekit/ai-contract";
import { defaultLinkHrefMaximumLength, normalizeLinkHref } from "../href";

/**
 * Declares hyperlinks as a character format whose value is the target address.
 *
 * @param name - Link mark name.
 * @returns Facts read and applied through the link mark's own commands.
 */
export function createLinkAiCapabilities(name: string): readonly QuireAiCapability[] {
  return [{
    kind: "format",
    name: "link",
    level: "character",
    present: { label: "链接" },
    description: "Hyperlink target such as \"https://example.com\", \"mailto:someone@example.com\" or \"#name\" for a bookmark in the document; null removes the link.",
    schema: { type: "string", minLength: 1, maxLength: defaultLinkHrefMaximumLength, examples: ["https://example.com", "mailto:someone@example.com"] },
    read: target => target.level === "character"
      ? normalizeLinkHref(target.marks.find(mark => mark.type.name === name)?.attrs.href) ?? undefined
      : undefined,
    apply: ({ commands }, value) => typeof value === "string" ? commands.setLink({ href: value }) : commands.unsetLink()
  }];
}
