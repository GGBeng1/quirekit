import { renderTextDiagram } from "@quirekit/text-diagram/browser";
import { textDiagramLanguage, type TextDiagramLanguage } from "@quirekit/text-diagram";

/** Host port key of the text figure renderer; the browser renderer is used when the host gives none. */
export const textFigureRenderPort = "textDiagram.render";

/** Renders figure source, rejecting with the grammar's error when it does not render. */
export type TextFigureRenderer = (language: TextDiagramLanguage, source: string) => Promise<unknown>;

/** Time a check may take before the figure is let through unchecked, in milliseconds. */
const checkBudget = 10_000;

/** Characters of a renderer error kept for the model. */
const errorLength = 400;

/**
 * @param fence - Fence source with its delimiter lines.
 * @returns Body between the delimiters.
 */
export function readFigureBody(fence: string): string {
  return fence.split("\n").slice(1, -1).join("\n");
}

/**
 * Renders figure source the way the editor will, to find syntax errors before it is written.
 * @param fence - Fence language as written.
 * @param body - Figure source.
 * @param ports - Host resources, optionally with a renderer.
 * @returns The renderer's error, or undefined when it renders or the check ran out of time.
 */
export async function checkTextFigure(fence: string, body: string, ports: Readonly<Record<string, unknown>>): Promise<string | undefined> {
  const language = textDiagramLanguage(fence);
  if (language === null) return undefined;
  if (body.trim() === "") return "the figure is empty";
  const render = typeof ports[textFigureRenderPort] === "function" ? ports[textFigureRenderPort] as TextFigureRenderer
    : (lang: TextDiagramLanguage, source: string) => renderTextDiagram(lang, source, { signal: AbortSignal.timeout(checkBudget) });
  try {
    await render(language, body);
    return undefined;
  } catch (error) {
    // A slow renderer is not a broken figure.
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) return undefined;
    const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/gu, " ").trim();
    return message.length > errorLength ? `${message.slice(0, errorLength)}…` : message || "the renderer rejected it";
  }
}
