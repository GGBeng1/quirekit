export {
  defaultLinkDisplayTextMaximumLength,
  defaultLinkHrefMaximumLength,
  Link,
  isAllowedLinkHref,
  normalizeLinkDisplayText,
  normalizeLinkHref,
  type LinkAttributes,
  type LinkInsertionAttributes,
  type LinkOptions
} from "./link";
export * from "./docx";
export { getLinkRange } from "./range";
export type { LinkRange } from "./types";
export { normalizeLinkAuthoringHref } from "./authoring/target";
