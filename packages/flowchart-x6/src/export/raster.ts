import type { FlowchartSnapshot } from "@quirekit/flowchart";
import type { FlowchartImageOptions } from "./types";
import { flowchartImageSize } from "./size";
import { flowchartSnapshotBackground } from "./background";
/** @param snapshot - Frozen adapter snapshot; never rereads an editor. @param options - Resolution and background. @param owner - Browser allocation realm. @param signal - Optional dialog/lifetime cancellation. @returns Bounded PNG data URL. */
export async function rasterizeFlowchartSnapshot(snapshot: FlowchartSnapshot, options: FlowchartImageOptions, owner: Document, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted();
  const size = flowchartImageSize(snapshot.width, snapshot.height, options.scale), view = owner.defaultView;
  if (!view) throw new Error("PNG 导出需要浏览器文档");
  const source = flowchartSnapshotBackground(snapshot, options.background, owner);
  const image = new view.Image(), url = view.URL.createObjectURL(new Blob([source.svg], { type: "image/svg+xml" }));
  try {
    image.src = url; await image.decode(); signal?.throwIfAborted();
    const canvas = owner.createElement("canvas"); canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("PNG 导出不可用");
    context.drawImage(image, 0, 0, size.width, size.height); return canvas.toDataURL("image/png");
  } finally { view.URL.revokeObjectURL(url); }
}
