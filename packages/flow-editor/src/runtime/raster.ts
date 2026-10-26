import type { FlowchartRasterSnapshot, FlowchartSnapshot } from "@quirekit/flowchart";

/** @param snapshot - Frozen source-bound SVG. @param owner - Host document. @param background - Resolved theme surface.
 * @returns Bounded PNG derived from that exact vector snapshot, without rereading the graph. */
export async function rasterizeFlowchart(snapshot: FlowchartSnapshot, owner: Document, background: string): Promise<FlowchartRasterSnapshot> {
  const scale = Math.min(2, 4096 / snapshot.width, 4096 / snapshot.height, Math.sqrt(8e6 / (snapshot.width * snapshot.height)));
  const width = Math.max(1, Math.floor(snapshot.width * scale)), height = Math.max(1, Math.floor(snapshot.height * scale));
  const view = owner.defaultView!;
  const image = new view.Image(), url = view.URL.createObjectURL(new Blob([snapshot.svg], { type: "image/svg+xml" }));
  try {
    image.src = url; await image.decode();
    const canvas = owner.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) throw new Error("图形预览生成失败，请重试");
    context.fillStyle = background; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
    return Object.freeze({ source: snapshot.source, dataUrl: canvas.toDataURL("image/png"), width, height });
  } finally { view.URL.revokeObjectURL(url); }
}
