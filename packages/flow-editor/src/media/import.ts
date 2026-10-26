import { flowchartSvgImage, readFlowchartImage, type FlowchartImage } from "@quirekit/flowchart";

/** @param file - User-selected image. @param document - Native decoding owner. @param signal - Dialog lifetime. @returns Portable resource after intrinsic decoding and bounded normalization. */
export async function importFlowImage(file: File, document: Document, signal: AbortSignal): Promise<FlowchartImage> {
  signal.throwIfAborted();
  if (file.size > 8e6) throw new Error("图片文件不能超过 8 MB");
  if (file.type === "image/svg+xml" || /\.svg$/iu.test(file.name)) {
    const text = await file.text(); signal.throwIfAborted();
    try { return flowchartSvgImage(text.replace(/^\s*<\?xml[^?]*\?>/u, ""), file.name.slice(0, 200)); }
    catch { throw new Error("SVG 含不支持的内容，请使用静态路径图标或转为 PNG"); }
  }
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("请选择 PNG、JPEG、WebP 或 SVG 图片");
  const view = document.defaultView; if (!view) throw new Error("图片解码不可用");
  const url = view.URL.createObjectURL(file), image = new view.Image();
  try {
    image.src = url;
    try { await image.decode(); } catch { signal.throwIfAborted(); throw new Error("无法读取图片，请检查文件是否完整"); }
    signal.throwIfAborted();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width > 4096 || height > 4096 || width * height > 8e6) throw new Error("图片尺寸不能超过 4096 像素或 800 万像素");
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("图片解码不可用");
    context.drawImage(image, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length > 1e6) throw new Error("图片内容过大，请压缩后重试");
    return readFlowchartImage({ dataUrl, width, height, alt: file.name.slice(0, 200) });
  } finally { view.URL.revokeObjectURL(url); }
}
