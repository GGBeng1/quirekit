import { expect, it, vi } from "vitest";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { createWhiteboardDocument } from "@quirekit/whiteboard";
import { captureScene, snapshotScene } from "./snapshot";

it("freezes source before a delayed preview and retains native element fields", async () => {
  const scene = { ...createWhiteboardDocument("test").scene, elements: [{ id: "shape", type: "rectangle", x: 0, y: 0, width: 80, height: 60, customData: { preserved: true } }] };
  const serialize = vi.fn(() => JSON.stringify(scene));
  const api = { getSceneElements: () => scene.elements, getAppState: () => scene.appState, getFiles: () => scene.files } as unknown as ExcalidrawImperativeAPI;
  const frozen = captureScene(api, serialize);
  let finish: (canvas: HTMLCanvasElement) => void = () => {};
  const render = vi.fn((_options: Parameters<typeof import("@excalidraw/excalidraw").exportToCanvas>[0]) => new Promise<HTMLCanvasElement>(resolve => { finish = resolve; }));
  const pending = snapshotScene(frozen, {} as Document, render);
  scene.elements[0]!.width = 160;
  finish({ width: 128, height: 108, toDataURL: () => "data:image/png;base64,AAAA" } as unknown as HTMLCanvasElement);
  const result = await pending;
  expect(result.scene.elements[0]).toMatchObject({ width: 80, customData: { preserved: true } });
  const options = render.mock.calls[0]![0];
  expect(options.exportPadding).toBe(24);
  expect(options.maxWidthOrHeight).toBeUndefined();
  expect(options.getDimensions!(720, 420)).toEqual({ width: 1440, height: 840, scale: 2 });
  expect(options.getDimensions!(300, 180)).toEqual({ width: 1440, height: 864, scale: 4.8 });
  expect(options.getDimensions!(8000, 4000)).toEqual({ width: 3072, height: 1536, scale: 0.384 });
  expect(serialize).toHaveBeenCalledTimes(1);
});
