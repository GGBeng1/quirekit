/// <reference path="../vendor/declarations.d.ts" />
import { mindMapRuntimeMessages } from "./locale";
import { readMindMapDocument } from "@quirekit/mind-map";
import { simpleLayouts, toSimpleTree } from "../codec/mapping";
import type { MindMapEditor, SimpleMindMapOptions } from "../types";
import { createMindMapController } from "./controller";
import { settleMindMapLayout } from "./layout";
import { projectMindMapAppearance } from "./appearance";
import { installSimpleForest } from "../vendor/forest";
import type { SimpleInstance, SimpleNode } from "../vendor/types";
import { prepareMindMapImages } from "./images";

/**
 * Lazily creates an isolated plain-text mind map after validating source and ownership.
 * @param options - Browser mount, canonical source and host callbacks.
 * @returns Editor ready for interaction and lossless source reads.
 */
export async function createSimpleMindMapEditor(options: SimpleMindMapOptions): Promise<MindMapEditor> {
  const text = mindMapRuntimeMessages(options.locale);
  const source = readMindMapDocument(options.document);
  options.signal?.throwIfAborted();
  const container = options.container;
  if (typeof document === "undefined" || container.ownerDocument !== document || !container.isConnected) {
    throw new Error("Mind map requires a connected container in the current document");
  }
  const { default: MindMap } = await import("simple-mind-map");
  await prepareMindMapImages(source);
  await document.fonts?.ready;
  options.signal?.throwIfAborted();
  const rect = container.getBoundingClientRect();
  if (!container.isConnected || rect.width <= 0 || rect.height <= 0) throw new Error("Mind map container must have positive dimensions");
  const mount = document.createElement("div");
  mount.dataset.quirekitMindMap = "";
  mount.style.cssText = "width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;position:relative;overscroll-behavior:contain;";
  mount.lang = options.locale ?? "zh-CN";
  mount.tabIndex = 0; mount.setAttribute("role", "application");
  mount.setAttribute("aria-label", options.label ?? text.canvas);
  container.append(mount);
  let instance: SimpleInstance | undefined;
  let editRequest = 0;
  try {
    const mountRect = mount.getBoundingClientRect();
    if (mountRect.width <= 0 || mountRect.height <= 0) throw new Error("Mind map content area must have positive dimensions");
    instance = new MindMap({ el: mount, data: toSimpleTree(source), layout: simpleLayouts[source.layout],
      ...(options.appearance ? { themeConfig: projectMindMapAppearance(options.appearance), hoverRectColor: options.appearance.primary } : {}),
      readonly: options.readOnly ?? false, fit: true, customInnerElsAppendTo: mount,
      /** Keeps external navigation behind the host's explicit link action. */
      customHyperlinkJump: () => {},
      customNoteContentShow: {
        /** Notes are read and edited by the shared property panel. */ show() {},
        /** No vendor tooltip is mounted. */ hide() {},
      },
      customCheckEnableShortcut: () => false, enableAutoEnterTextEditWhenKeydown: false,
      openRealtimeRenderOnNodeTextEdit: true, enableDragModifyNodeWidth: false,
      addHistoryOnInit: false, addHistoryTime: 0, maxHistoryCount: 100,
      defaultInsertSecondLevelNodeText: text.branch, defaultInsertBelowSecondLevelNodeText: text.child,
      selectTextOnEnterEditText: true,
      isDisableDrag: true, enableDblclickBackToRootNode: false, enableCtrlKeyNodeSelection: false,
      /** @param node - Requested editing target. @returns Whether its settled overlay is still current and permitted. */
      beforeTextEdit: async (node: SimpleNode) => {
        // A preceding Enter may still be replacing SVG text nodes. Measuring in
        // that interval returns a zero rectangle and opens the overlay at (0, 0).
        if (!instance || mount.inert) return false;
        const request = ++editRequest;
        await settleMindMapLayout(instance);
        return request === editRequest && mount.isConnected && !mount.inert && !instance.opt.readonly
          && instance.renderer.activeNodeList.includes(node);
      },
      errorHandler: (_code: string, error: unknown) => {
        if (mount.isConnected && !mount.inert) (options.onError ?? console.error)(error);
      },
    });
    installSimpleForest(instance);
    await settleMindMapLayout(instance);
    if (!mount.isConnected) throw new Error("Mind map container was detached during initialization");
    instance.command.originAddHistory();
    options.signal?.throwIfAborted();
    return createMindMapController(instance, mount, source, options);
  } catch (error) {
    try { instance?.destroy(); } finally { mount.remove(); }
    throw error;
  }
}
