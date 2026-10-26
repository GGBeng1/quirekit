import type { DocxAuthoringApi, DocxCodecDiagnosticInput, LitAstNode } from "@quirekit/lit-docx-contract";
import { createQuireInlineImageResolver } from "@quirekit/media";
import { parseFlowchartEmbed, readFlowchartEmbed, serializeFlowchartEmbed, type FlowchartEmbed } from "@quirekit/flowchart";
import type { FlowchartDocxOptions } from "./types";

/** Same versioned tag for PM and Markdown Word consumers. */
export const flowchartDocxTag = "quirekit:flowchart:1";

/** @param value - Untrusted metadata payload. @returns Whether fields can be inspected as an inert JSON record. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

/** @param input - Saved source and its matching preview. @param api - Central Word authoring facade.
 * @param report - Operation-local diagnostic owner. @param options - Optional recovery policy.
 * @returns Standard visible Word content, with bounded optional source metadata. */
export function projectFlowchart(input: unknown, api: DocxAuthoringApi, report: (diagnostic: DocxCodecDiagnosticInput) => void,
  options: FlowchartDocxOptions): LitAstNode {
  const flow = readFlowchartEmbed(input), preview = flow.preview;
  if (!preview && (flow.document.nodes.length || flow.document.edges.length)) throw new Error("流程图缺少预览，请打开图形编辑器并保存后再导出");
  if (preview && !preview.dataUrl) throw new Error("流程图预览图是外部地址，请先取回图片再导出");
  if (preview?.dataUrl && !createQuireInlineImageResolver().resolve({ kind: "external", href: preview.dataUrl })) throw new Error("流程图 PNG 数据无效，请重新保存图形");
  const scale = preview ? Math.min(560 / preview.width, 460 / preview.height, 1) : 1;
  const children = [api.blocks.paragraph({ children: preview ? [{ type: "image", attrs: {
    src: preview.dataUrl, alt: flow.title, name: `${flow.title}.png`, width: preview.width * scale, height: preview.height * scale,
  } }] : [api.inline.text(`流程图：${flow.title}（空白）`)] })];
  // The visible image is already a package resource. Keep only canonical graph
  // source and intrinsic dimensions in metadata, under the central safety budget.
  const source = serializeFlowchartEmbed({ ...flow, preview: null });
  const metadata = { version: 1, data: { source, width: preview?.width ?? 0, height: preview?.height ?? 0 } };
  const preserve = options.metadata !== false && new TextEncoder().encode(JSON.stringify(metadata)).length <= 65_536;
  report({ code: preserve ? "flowchart-image-projected" : "flowchart-source-not-retained", severity: preserve ? "info" : "warning", disposition: "projected",
    message: preserve ? "流程图以图片导出，并保留可见内容未修改时可恢复的图形源；空图保留标题。"
      : "流程图预览已导出；源数据超过 Word 元数据预算或已关闭源保留。请保留原生 JSON 或 Markdown 以继续编辑。" });
  return api.roundTrip.taggedBlock({ tag: flowchartDocxTag, alias: flow.title, children, ...(preserve ? { metadata, metadataOptional: true } : {}) });
}

/** @param node - Fingerprint-checked fallback. @returns Its only image, otherwise null. */
function imageIn(node: LitAstNode): LitAstNode | null {
  const images: LitAstNode[] = [];
  /** @param current - Visible content subtree. */
  function visit(current: LitAstNode): void { if (current.type === "image") images.push(current); (current.children ?? []).forEach(visit); }
  visit(node); return images.length === 1 ? images[0]! : null;
}

/** @param node - Current tagged control. @param api - Fingerprint-aware metadata reader.
 * @returns Valid editable source, or null to retain the user's current Word content. */
export function recoverFlowchart(node: LitAstNode, api: DocxAuthoringApi): FlowchartEmbed | null {
  const metadata = api.roundTrip.readMetadata(node), data = metadata?.data;
  if (metadata?.version !== 1 || !isRecord(data) || typeof data.source !== "string") return null;
  try {
    if (Object.keys(data).some(key => !["source", "width", "height"].includes(key))) return null;
    const source = parseFlowchartEmbed(data.source), image = imageIn(node);
    if (source.preview !== null) return null;
    const empty = data.width === 0 && data.height === 0;
    if (empty && (source.document.nodes.length || source.document.edges.length || image)) return null;
    const preview = empty ? null : { dataUrl: image?.attrs?.src, width: data.width, height: data.height };
    return readFlowchartEmbed({ ...source, preview });
  } catch { return null; }
}
