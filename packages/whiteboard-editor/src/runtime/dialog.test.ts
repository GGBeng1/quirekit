// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from "vitest";
import { createWhiteboardDocument } from "@quirekit/whiteboard";
const mocked = vi.hoisted(() => ({ mount: vi.fn(), unmount: vi.fn(), app: { config: {} } }));
vi.mock("vue", () => ({ h: vi.fn(), createApp: () => ({ ...mocked.app, mount: mocked.mount, unmount: mocked.unmount }) }));
vi.mock("@quirekit/ui/vue", () => ({ QuireLocaleProvider: {} }));
vi.mock("../vue/dialog.vue", () => ({ default: {} }));
import { openWhiteboardDialog } from "./dialog";

beforeEach(() => { vi.clearAllMocks(); document.body.replaceChildren(); });
it("does not mount under the opening menu gesture and releases once on early cancellation", async () => {
  let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 1; });
  const release = vi.fn(), commit = vi.fn(() => "saved" as const);
  const task = openWhiteboardDialog({ ownerDocument: document, request: { document: createWhiteboardDocument("test"), commit, release } });
  expect(mocked.mount).not.toHaveBeenCalled(); task.close(); await vi.dynamicImportSettled(); frame?.(0); task.close();
  expect(mocked.mount).not.toHaveBeenCalled(); expect(mocked.unmount).not.toHaveBeenCalled();
  expect(release).toHaveBeenCalledTimes(1); expect(commit).not.toHaveBeenCalled(); expect(document.body.childElementCount).toBe(0);
});
it("unmounts a live task once when its document is destroyed", async () => {
  let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 1; });
  const controller = new AbortController(), release = vi.fn();
  const task = openWhiteboardDialog({ ownerDocument: document, signal: controller.signal,
    request: { document: createWhiteboardDocument("test"), commit: () => "saved", release } });
  await vi.dynamicImportSettled(); frame!(0); expect(mocked.mount).toHaveBeenCalledTimes(1); controller.abort(); task.close();
  expect(mocked.unmount).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
});
