import { WhiteboardError } from "@quirekit/whiteboard";
import { en } from "./en";
import { zhCN } from "./zh-cn";
import type { WhiteboardMessages } from "./types";

/** @param locale - Host BCP 47 tag. @returns Complete interface copy with the same Chinese default as QuireKit UI. */
export function whiteboardMessages(locale: string): WhiteboardMessages {
  return /^en(?:-|$)/iu.test(locale.trim()) ? en : zhCN;
}
/** @param error - Original diagnostic, retained independently of its translated presentation. @param locale - Current interface language. @param fallback - Message for unknown failures. @returns Safe localized feedback. */
export function whiteboardErrorMessage(error: unknown, locale: string, fallback: keyof WhiteboardMessages = "failure"): string {
  const messages = whiteboardMessages(locale);
  const code = error instanceof WhiteboardError ? error.code : error instanceof SyntaxError ? "invalidJson"
    : error instanceof Error && error.name === "QuotaExceededError" ? "storageQuota" : "";
  return Object.hasOwn(messages, code) ? messages[code as keyof WhiteboardMessages] : messages[fallback];
}
/** @param element - Mounted product root or its descendant. @returns Nearest explicit UI language, supporting independent editors on one page. */
export function readWhiteboardLocale(element: HTMLElement): string { return element.closest<HTMLElement>("[lang]")?.lang || "zh-CN"; }
