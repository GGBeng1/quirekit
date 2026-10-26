import type { DocxAuthoringApi, DocxCodecDiagnosticInput, LitAstNode } from "@quirekit/lit-docx-contract";
import { createQuireInlineImageResolver } from "@quirekit/media";
import { parseWhiteboard, readWhiteboardDocument, serializeWhiteboard, whiteboardRecord, type WhiteboardDocument } from "@quirekit/whiteboard";
import type { WhiteboardDocxOptions } from "./types";

/** Same tag and metadata protocol for PM and Markdown consumers. */
export const whiteboardDocxTag = "quirekit:whiteboard:1";

/**
 * Projects a saved snapshot without consulting live DOM or loading Excalidraw.
 * @param input - Complete saved board.
 * @param api - Central semantic authoring facade.
 * @param report - Codec diagnostic owner.
 * @param options - Optional source-recovery policy.
 * @returns Standard Word content control containing an inline PNG.
 */
export function projectWhiteboard(input: unknown, api: DocxAuthoringApi, report: (diagnostic: DocxCodecDiagnosticInput) => void,
  options: WhiteboardDocxOptions): LitAstNode {
  const board = readWhiteboardDocument(input), preview = board.preview;
  if (!preview && board.scene.elements.some(element => !element.isDeleted)) throw new Error("白板缺少预览，请打开白板并保存后再导出");
  if (preview && !preview.dataUrl) throw new Error("白板预览图是外部地址，请先取回图片再导出");
  if (preview?.dataUrl && !createQuireInlineImageResolver().resolve({ kind: "external", href: preview.dataUrl })) throw new Error("白板 PNG 数据无效，请重新保存白板");
  const scale = preview ? Math.min(560 / preview.width, 460 / preview.height, 1) : 1;
  const children = [api.blocks.paragraph({ children: preview ? [{ type: "image", attrs: {
    src: preview.dataUrl, alt: board.title, name: `${board.title}.png`, width: preview.width * scale, height: preview.height * scale,
  } }] : [api.inline.text(`白板：${board.title}`)] })];
  const source = serializeWhiteboard({ ...board, preview: null });
  const metadata = { version: 1, data: { source, width: preview?.width ?? 0, height: preview?.height ?? 0 } };
  const preserve = options.metadata !== false && new TextEncoder().encode(JSON.stringify(metadata)).length <= 65_536;
  report({ code: preserve ? "whiteboard-image-projected" : "whiteboard-source-not-retained", severity: !preserve && options.metadata !== false ? "warning" : "info", disposition: "projected",
    message: preserve ? "白板以图片导出。重新导入时，仅附带可编辑源且图片未被修改的白板可恢复编辑。"
      : `${options.metadata === false ? "本次已关闭白板源保留" : "白板可编辑源超过文件的大小上限"}，Word 仅保留图片，重新导入后无法继续编辑此白板。完整内容仍在原文档中，可另行导出白板源文件。` });
  return api.roundTrip.taggedBlock({ tag: whiteboardDocxTag, alias: board.title, children, ...(preserve ? { metadata, metadataOptional: true } : {}) });
}

/** @param node - Current visible fallback, already fingerprint checked by the codec. @returns Its single image, or null if structurally changed. */
function imageIn(node: LitAstNode): LitAstNode | null {
  const images: LitAstNode[] = [];
  /** @param current - Visible subtree. */
  function visit(current: LitAstNode): void { if (current.type === "image") images.push(current); (current.children ?? []).forEach(visit); }
  visit(node); return images.length === 1 ? images[0]! : null;
}

/** @param node - Parsed tagged control. @param api - Fingerprint-aware metadata reader. @returns Valid restored source, or null to keep current Word content. */
export function recoverWhiteboard(node: LitAstNode, api: DocxAuthoringApi): WhiteboardDocument | null {
  const metadata = api.roundTrip.readMetadata(node), data = metadata?.data;
  if (metadata?.version !== 1 || !whiteboardRecord(data) || typeof data.source !== "string") return null;
  try {
    const source = parseWhiteboard(data.source), image = imageIn(node);
    const preview = data.width === 0 && data.height === 0 ? null
      : { dataUrl: image?.attrs?.src, width: data.width, height: data.height };
    return readWhiteboardDocument({ ...source, preview });
  } catch { return null; }
}
