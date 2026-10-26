import type { MindMapTopicImage } from "@quirekit/mind-map";

/** @param file - Explicitly chosen local PNG/JPEG/WebP. @param owner - Host document.
 * @returns Bounded embedded PNG; object URLs never escape the operation. */
export async function readMindEditorImage(file: File, owner: Document): Promise<MindMapTopicImage> {
  if (file.size > 8 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("请选择不超过 8 MiB 的 PNG、JPEG 或 WebP 图片");
  const view = owner.defaultView!, image = new view.Image(), url = view.URL.createObjectURL(file);
  try {
    image.src = url; await image.decode();
    if (image.naturalWidth * image.naturalHeight > 16e6) throw new Error("图片尺寸过大，请先缩小到 1600 万像素以内");
    const ratio = Math.min(1, 512 / image.naturalWidth, 512 / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio)), height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = owner.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("无法读取图片，请重试");
    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png"); if (dataUrl.length > 1e6) throw new Error("转换后的图片过大，请选择更小的图片");
    const display = Math.min(1, 256 / width, 192 / height);
    return { dataUrl, width: Math.max(1, Math.round(width * display)), height: Math.max(1, Math.round(height * display)), alt: file.name.slice(0, 200) };
  } finally { view.URL.revokeObjectURL(url); }
}
