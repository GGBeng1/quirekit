import type { DocxAuthoringApi, DocxCodecDiagnosticInput, LitAstNode } from "@quirekit/lit-docx-contract";
import { createQuireInlineImageResolver } from "@quirekit/media";
import { readTextDiagram, serializeTextDiagram, type TextDiagramEmbed } from "@quirekit/text-diagram";

/** Unbound rich-text control identifying the portable source protocol. */
export const textDiagramDocxTag = "quirekit:text-diagram:1";

/** @param input - Persisted envelope. @param api - Central Word builders. @param report - Operation diagnostic sink.
 * @returns A standard image with optional fingerprint-protected source metadata. */
export function projectTextDiagram(input: unknown, api: DocxAuthoringApi, report: (diagnostic: DocxCodecDiagnosticInput) => void): LitAstNode {
  const diagram = readTextDiagram(input), preview = diagram.preview;
  if (!preview) throw new Error("文本绘图缺少预览，请打开源码编辑器并保存后再导出");
  if (!createQuireInlineImageResolver().resolve({ kind: "external", href: preview.dataUrl })) throw new Error("文本绘图 PNG 数据无效，请重新保存");
  const scale = Math.min(560 / preview.width, 460 / preview.height, 1);
  const children = [api.blocks.paragraph({ children: [{ type: "image", attrs: {
    src: preview.dataUrl, alt: diagram.title, name: `${diagram.title}.png`, width: preview.width * scale, height: preview.height * scale,
  } }] })];
  // The visible image is the only PNG authority. Metadata carries exact source
  // and intrinsic dimensions; the central codec owns package budgets/fingerprints.
  const metadata = { version: 1, data: { source: serializeTextDiagram({ ...diagram, preview: null }), width: preview.width, height: preview.height } };
  const preserve = new TextEncoder().encode(JSON.stringify(metadata)).length <= 65_536;
  report({ code: preserve ? "text-diagram-image-projected" : "text-diagram-source-not-retained", severity: preserve ? "info" : "warning", disposition: "projected",
    message: preserve ? "文本绘图以图片导出；可见内容未修改且元数据有效时可恢复源码。"
      : "文本绘图图片已导出，源码超过 Word 元数据预算；请保留原生 JSON 以继续编辑。" });
  return api.roundTrip.taggedBlock({ tag: textDiagramDocxTag, alias: diagram.title, children, ...(preserve ? { metadata, metadataOptional: true } : {}) });
}

/** @param node - Fingerprint-checked visible content. @returns The only image, otherwise null. */
function singleImage(node: LitAstNode): LitAstNode | null {
  const images: LitAstNode[] = [];
  /** @param current - One visible subtree. */
  function visit(current: LitAstNode): void { if (current.type === "image") images.push(current); (current.children ?? []).forEach(visit); }
  visit(node); return images.length === 1 ? images[0]! : null;
}

/** @param node - Tagged Word control. @param api - Fingerprint-aware metadata facade.
 * @returns Valid source with its current PNG, or null to preserve current Word content. */
export function recoverTextDiagram(node: LitAstNode, api: DocxAuthoringApi): TextDiagramEmbed | null {
  const metadata = api.roundTrip.readMetadata(node), data = metadata?.data;
  if (metadata?.version !== 1 || !data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (typeof value.source !== "string" || value.source.length > 200_000 || Object.keys(value).some(key => !["source", "width", "height"].includes(key))) return null;
  try {
    const source = readTextDiagram(JSON.parse(value.source));
    if (source.preview !== null) return null;
    return readTextDiagram({ ...source, preview: { dataUrl: singleImage(node)?.attrs?.src, width: value.width, height: value.height } });
  } catch { return null; }
}
