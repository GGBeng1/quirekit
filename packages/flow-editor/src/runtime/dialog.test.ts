// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from "vitest";
import { createFlowchartEmbed } from "@quirekit/flowchart";
const mocked = vi.hoisted(() => ({ createApp: vi.fn(), mount: vi.fn(), unmount: vi.fn(), app: { config: {} } }));
vi.mock("vue", () => ({ createApp: (...args: unknown[]) => { mocked.createApp(...args); return { ...mocked.app, mount: mocked.mount, unmount: mocked.unmount }; } }));
vi.mock("../vue/dialog.vue", () => ({ default: {} }));
import { openFlowchartDialog } from "./dialog";

beforeEach(() => { vi.clearAllMocks(); document.body.replaceChildren(); });
it("does not mount under the opening menu gesture and releases once on early cancellation", async () => {
  let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 1; });
  const release = vi.fn(), commit = vi.fn(() => "saved" as const);
  const task = openFlowchartDialog({ ownerDocument: document, request: { document: createFlowchartEmbed("test"), commit, release } });
  expect(mocked.mount).not.toHaveBeenCalled(); task.close(); await vi.dynamicImportSettled(); frame?.(0); task.close();
  expect(mocked.mount).not.toHaveBeenCalled(); expect(mocked.unmount).not.toHaveBeenCalled();
  expect(release).toHaveBeenCalledTimes(1); expect(commit).not.toHaveBeenCalled(); expect(document.body.childElementCount).toBe(0);
});
it("unmounts a live task once when its document is destroyed", async () => {
  let frame: FrameRequestCallback | undefined;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frame = callback; return 1; });
  const controller = new AbortController(), release = vi.fn();
  const task = openFlowchartDialog({ ownerDocument: document, signal: controller.signal,
    request: { document: createFlowchartEmbed("test"), commit: () => "saved", release } });
  await vi.dynamicImportSettled(); frame!(0); expect(mocked.mount).toHaveBeenCalledTimes(1); controller.abort(); task.close();
  expect(mocked.unmount).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
});

it("passes an explicit host locale into its independent Vue app", async () => {
  const task = openFlowchartDialog({ ownerDocument: document, locale: "en-GB", request: { document: createFlowchartEmbed("english"), commit: () => "saved", release: vi.fn() } });
  await vi.dynamicImportSettled();
  expect(mocked.createApp).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "en-GB" }));
  task.close();
});
