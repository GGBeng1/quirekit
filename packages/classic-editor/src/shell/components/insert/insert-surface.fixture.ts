import type {
  ClassicEditorActionDefinition,
  ClassicEditorRenderContext
} from "../../../types";
import type {
  ClassicEditorInsertCatalogOptions,
  ClassicEditorInsertItemDefinition
} from "../../../types/insert";
import {
  mountClassicEditorInsertSurface,
  type MountedClassicEditorInsertSurface
} from "./mount";

/** Deterministic mounted fixture returned to Insert component tests. */
export interface ClassicEditorInsertSurfaceFixture {
  /** Fake root-local product authority. */
  readonly context: ClassicEditorRenderContext;
  /** Native control used to verify focus restoration. */
  readonly trigger: HTMLButtonElement;
  /** Mounted surface lifecycle and direct trigger handle. */
  readonly mounted: MountedClassicEditorInsertSurface;
}

/**
 * Creates and mounts one realistic Insert surface test fixture.
 *
 * @param ownerDocument - DOM authority supplied by the active test environment.
 * @param width - Root inline size in CSS pixels.
 * @param locale - Product interface locale.
 * @returns Root-local context, trigger, and mounted surface.
 */
export function createClassicEditorInsertSurfaceFixture(
  ownerDocument: Document,
  width: number,
  locale: ClassicEditorRenderContext["locale"] = "zh-CN"
): ClassicEditorInsertSurfaceFixture {
  const root = ownerDocument.createElement("section");
  root.className = "qk-classic-editor";
  root.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    right: width,
    bottom: 816,
    left: 0,
    width,
    height: 816,
    toJSON: () => ({})
  });
  const trigger = ownerDocument.createElement("button");
  trigger.textContent = "Insert";
  root.append(trigger);
  ownerDocument.body.append(root);
  const context: ClassicEditorRenderContext = {
    instance: {} as ClassicEditorRenderContext["instance"],
    editor: {} as ClassicEditorRenderContext["editor"],
    root,
    ownerDocument,
    features: {},
    locale,
    backend: "canvas",
    ui: {} as ClassicEditorRenderContext["ui"]
  };
  const mounted = mountClassicEditorInsertSurface(context, createInsertOptions());
  root.append(mounted.element);
  return { context, trigger, mounted };
}

/** @returns Catalog options covering all capability and layout states. */
function createInsertOptions(): ClassicEditorInsertCatalogOptions {
  const items: readonly ClassicEditorInsertItemDefinition[] = [
    {
      id: "link",
      group: "inline",
      action: action("link"),
      description: { "zh-CN": "创建网页或文档链接", en: "Create a web or document link" },
      keywords: ["hyperlink"],
      preview: "↗"
    },
    {
      id: "table",
      group: "structure",
      action: { ...action("table"), order: 200 },
      description: { "zh-CN": "插入结构化表格", en: "Insert a structured table" },
      presentation: "gallery",
      preview: "▦"
    },
    {
      id: "image",
      group: "media",
      action: { ...action("image"), order: 300 },
      capability: () => ({
        mode: "host-missing",
        reason: {
          code: "media-host-missing",
          message: { "zh-CN": "宿主尚未配置媒体选择器", en: "The host has no media picker" }
        }
      }),
      preview: "▧"
    },
    {
      id: "control",
      group: "control",
      action: { ...action("control"), isAvailable: () => false, order: 400 },
      capability: () => ({ mode: "unsupported" }),
      preview: "☑"
    },
    {
      id: "hidden-marketplace",
      group: "control",
      action: action("hidden-marketplace"),
      capability: () => ({ mode: "hidden" })
    }
  ];
  return { items };
}

/**
 * Creates one canonical action suitable for direct catalog projection.
 *
 * @param id - Stable action identity.
 * @returns Canonical action definition.
 */
function action(id: string): ClassicEditorActionDefinition {
  return {
    id,
    label: { "zh-CN": `中文 ${id}`, en: `English ${id}` },
    order: 100,
    run: () => true
  };
}
