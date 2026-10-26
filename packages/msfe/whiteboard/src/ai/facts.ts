import type { QuireAiSourceCapability } from "@quirekit/ai-contract";
import { parseWhiteboard } from "@quirekit/whiteboard";

/** Texts shown in a summary. */
const shownTexts = 30;

/** Shows a whiteboard fence as its title, size and texts instead of the scene JSON. */
export const msfeWhiteboardAiCapabilities: readonly QuireAiSourceCapability[] = [{
  kind: "source-block",
  names: ["FencedCode"],
  present(block) {
    if (block.attrs.language !== "quirekit-whiteboard") return undefined;
    try {
      const board = parseWhiteboard(block.text.split("\n").slice(1, -1).join("\n"));
      const elements = board.scene.elements.filter(element => element.isDeleted !== true);
      const texts = elements.flatMap(element => typeof element.text === "string" && element.text.trim() !== "" ? [element.text.replace(/\s+/gu, " ").trim()] : []);
      const shown = texts.length === 0 ? "" : `文字：${texts.slice(0, shownTexts).join("、")}${texts.length > shownTexts ? `等 ${texts.length} 项` : ""}`;
      return { label: `白板：${board.title || "未命名"}（${elements.length} 个元素）${shown}`, title: `白板“${board.title || "未命名"}”` };
    } catch {
      return { label: "白板：源数据无效" };
    }
  }
}];
