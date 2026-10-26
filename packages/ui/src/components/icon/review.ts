import { quireKitEditorLucideIconSvg } from "./lucide";
import { formattingIconSvg } from "./custom/formatting";

/** Compatibility export of the shared review family; no independently maintained artwork. */
export const quireKitReviewIconSvg = Object.freeze({
  commentPrevious: quireKitEditorLucideIconSvg.commentPrevious,
  commentNext: quireKitEditorLucideIconSvg.commentNext,
  revisionPrevious: quireKitEditorLucideIconSvg.revisionPrevious,
  revisionNext: quireKitEditorLucideIconSvg.revisionNext,
  revisionAccept: quireKitEditorLucideIconSvg.revisionAccept,
  revisionReject: quireKitEditorLucideIconSvg.revisionReject,
  revisionAcceptAll: quireKitEditorLucideIconSvg.revisionAcceptAll,
  revisionRejectAll: quireKitEditorLucideIconSvg.revisionRejectAll,
  revisionMarkup: quireKitEditorLucideIconSvg.revisionMarkup,
  revisionFinal: quireKitEditorLucideIconSvg.revisionFinal,
  revisionOriginal: quireKitEditorLucideIconSvg.revisionOriginal,
  trackChanges: quireKitEditorLucideIconSvg.trackChanges,
  revisionSimpleMarkup: formattingIconSvg.revisionSimpleMarkup
});
