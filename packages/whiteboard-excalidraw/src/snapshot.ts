import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { readWhiteboardScene, whiteboardRecord } from "@quirekit/whiteboard";
import type { WhiteboardScene } from "@quirekit/whiteboard";
import type { WhiteboardSnapshot } from "./types";

/** @param width - Native scene width including padding. @param height - Native scene height including padding. @returns Retina document preview bounded to nine megapixels. */
function previewDimensions(width: number, height: number) {
  const scale = Math.min(3072 / Math.max(width, height), Math.max(2, Math.min(1440 / width, 920 / height)));
  return { width: Math.min(3072, Math.max(1, Math.ceil(width * scale))), height: Math.min(3072, Math.max(1, Math.ceil(height * scale))), scale };
}

/** @param api - Mounted scene owner. @param serialize - Public upstream serializer. @returns Detached source without viewport or ephemeral state. */
export function captureScene(api: ExcalidrawImperativeAPI, serialize: typeof import("@excalidraw/excalidraw").serializeAsJSON): WhiteboardScene {
  const source: unknown = JSON.parse(serialize(api.getSceneElements(), api.getAppState(), api.getFiles(), "local"));
  if (whiteboardRecord(source)) source.version = 2;
  return readWhiteboardScene(source);
}

/** @param scene - Already frozen source. @param owner - Browser document. @param render - Public upstream PNG renderer.
 * @returns A PNG that cannot race ahead of the saved source. */
export async function snapshotScene(scene: WhiteboardScene, owner: Document, render: typeof import("@excalidraw/excalidraw").exportToCanvas): Promise<WhiteboardSnapshot> {
  const elements = scene.elements as unknown as readonly ExcalidrawElement[];
  const visible = elements.filter((element): element is NonDeletedExcalidrawElement => !element.isDeleted);
  const canvas = visible.length ? await render({ elements: visible, appState: { ...scene.appState, exportBackground: true, exportWithDarkMode: false } as Partial<AppState>,
    files: scene.files as BinaryFiles, getDimensions: previewDimensions, exportPadding: 24 }) : owner.createElement("canvas");
  if (!visible.length) {
    canvas.width = 720; canvas.height = 420;
    const context = canvas.getContext("2d")!; context.fillStyle = "#ffffff"; context.fillRect(0, 0, 720, 420);
  }
  return { scene, preview: { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height } };
}
