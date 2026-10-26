import type { DocxAuthoringApi, DocxCodecDiagnosticInput, LitAstNode } from "@quirekit/lit-docx-contract";
import { createQuireInlineImageResolver } from "@quirekit/media";
import { parseMindMapEmbed, readMindMapEmbed, serializeMindMapEmbed, type MindMapEmbed } from "@quirekit/mind-map";
import { projectMindMapOutline } from "./outline";
import type { MindMapDocxOptions } from "./types";

/** One versioned tag shared by PM and Markdown consumers. */
export const mindMapDocxTag = "quirekit:mind-map:1";

/** @param value - Untrusted metadata. @returns Whether it is an inert record. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

/** @param input - Saved source and matching preview. @param api - Central Word authoring facade.
 * @param report - Operation-local diagnostics. @param options - Optional recovery policy.
 * @returns Visible Word content with bounded optional source recovery. */
export function projectMindMap(input: unknown, api: DocxAuthoringApi, report: (diagnostic: DocxCodecDiagnosticInput) => void,
  options: MindMapDocxOptions): LitAstNode {
  const mind = readMindMapEmbed(input), preview = mind.preview;
  if (preview && !preview.dataUrl) throw new Error("思维导图预览图是外部地址，请先取回图片再导出");
  if (preview?.dataUrl && !createQuireInlineImageResolver().resolve({ kind: "external", href: preview.dataUrl })) {
    throw new Error("思维导图 PNG 数据无效，请重新保存脑图");
  }
  const scale = preview ? Math.min(560 / preview.width, 460 / preview.height, 1) : 1;
  const children = preview ? [api.blocks.paragraph({ children: [{ type: "image", attrs: {
    src: preview.dataUrl, alt: mind.title, name: `${mind.title}.png`, width: preview.width * scale, height: preview.height * scale,
  } }] })] : projectMindMapOutline(mind, api);

  // The central package already owns the PNG. Store only canonical source and
  // intrinsic dimensions; optional recovery must never prevent visible export.
  const source = serializeMindMapEmbed({ ...mind, preview: null });
  const metadata = { version: 1, data: { source, width: preview?.width ?? 0, height: preview?.height ?? 0 } };
  const preserve = options.metadata !== false && new TextEncoder().encode(JSON.stringify(metadata)).length <= 65_536;
  report({ code: preview ? "mind-map-image-projected" : "mind-map-outline-projected", severity: preview ? "info" : "warning", disposition: preview ? "projected" : "approximated",
    message: preview ? "思维导图以图片导出；可编辑源按元数据保留策略处理，可见内容未修改时可恢复。"
      : "思维导图尚无预览，已保留完整主题文字大纲；打开脑图并保存后可导出图像布局。" });
  if (!preserve) report({ code: "mind-map-source-not-retained", severity: "warning", disposition: "approximated",
    message: "脑图可见内容已导出；源数据超过 Word 元数据预算或已关闭源保留。请保留原生 JSON 或 Markdown 以继续编辑。" });
  return api.roundTrip.taggedBlock({ tag: mindMapDocxTag, alias: mind.title, children,
    ...(preserve ? { metadata, metadataOptional: true } : {}) });
}

/** @param node - Fingerprint-checked visible subtree. @returns All embedded images, so ambiguous projections cannot restore source. */
function imagesIn(node: LitAstNode): LitAstNode[] {
  const images: LitAstNode[] = [];
  /** @param current - Current visible content. */
  function visit(current: LitAstNode): void { if (current.type === "image") images.push(current); (current.children ?? []).forEach(visit); }
  visit(node); return images;
}

/** @param node - Current tagged control. @param api - Fingerprint-aware metadata reader.
 * @returns Valid editable source, or null to retain current Word content. */
export function recoverMindMap(node: LitAstNode, api: DocxAuthoringApi): MindMapEmbed | null {
  const metadata = api.roundTrip.readMetadata(node), data = metadata?.data;
  if (metadata?.version !== 1 || !isRecord(data) || typeof data.source !== "string") return null;
  try {
    if (Object.keys(data).some(key => !["source", "width", "height"].includes(key))) return null;
    const source = parseMindMapEmbed(data.source), images = imagesIn(node);
    if (source.preview !== null) return null;
    if (data.width === 0 && data.height === 0) return images.length === 0 ? source : null;
    if (images.length !== 1) return null;
    const restored = readMindMapEmbed({ ...source, preview: { dataUrl: images[0]!.attrs?.src, width: data.width, height: data.height } });
    return createQuireInlineImageResolver().resolve({ kind: "external", href: restored.preview!.dataUrl! }) ? restored : null;
  } catch { return null; }
}
