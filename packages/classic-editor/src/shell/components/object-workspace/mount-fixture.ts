import type {
  ClassicEditorActionDefinition,
  ClassicEditorRenderContext
} from "../../../types";
import type {
  ClassicEditorObjectFreshness,
  ClassicEditorObjectTarget,
  ClassicEditorObjectWorkspaceContribution
} from "../../../types/object-workspace";
import {
  mountClassicEditorObjectWorkspace,
  type MountedClassicEditorObjectWorkspace
} from "./mount";

/** Deterministic mounted object workspace fixture. */
export interface ClassicEditorObjectWorkspaceFixture {
  /** Owning root with an explicit root-local width. */
  readonly root: HTMLElement;
  /** Render context used by direct actions. */
  readonly context: ClassicEditorRenderContext;
  /** Mounted real Vue presenter. */
  readonly mounted: MountedClassicEditorObjectWorkspace;
  /** Exact active contribution. */
  readonly contribution: ClassicEditorObjectWorkspaceContribution;
  /** Updates the owner-supplied exact-target freshness. */
  readonly setFreshness: (freshness: ClassicEditorObjectFreshness) => void;
}

/**
 * Mounts one root-local object workspace with generic fields and direct actions.
 *
 * @param ownerDocument - Active test DOM authority.
 * @param width - Explicit root-local inline size.
 * @param locale - Product locale.
 * @returns Mounted object fixture.
 */
export function createClassicEditorObjectWorkspaceFixture(
  ownerDocument: Document,
  width: number,
  locale: ClassicEditorRenderContext["locale"] = "zh-CN"
): ClassicEditorObjectWorkspaceFixture {
  const root = ownerDocument.createElement("section");
  root.className = "qk-classic-editor";
  root.dataset.commandCount = "0";
  root.getBoundingClientRect = () => rect(0, 0, width, 816);
  const documentOverlays = ownerDocument.createElement("div");
  documentOverlays.dataset.qkClassicDocumentOverlays = "";
  root.append(documentOverlays);
  ownerDocument.body.append(root);
  const commands = {
    setFixture(payload: unknown): boolean {
      root.dataset.commandCount = String(Number(root.dataset.commandCount ?? "0") + 1);
      root.dataset.lastPayload = JSON.stringify(payload);
      return true;
    }
  };
  const context = {
    instance: {},
    editor: { commands, isEditable: true },
    root,
    ownerDocument,
    features: {},
    locale,
    backend: "canvas",
    ui: {}
  } as unknown as ClassicEditorRenderContext;
  const mounted = mountClassicEditorObjectWorkspace(context);
  root.append(mounted.element);
  const target = fixtureTarget();
  let freshness: ClassicEditorObjectFreshness = {
    revision: 1,
    status: "ready",
    reason: null
  };
  const contribution = fixtureContribution(target, () => freshness);
  mounted.activate(contribution);
  return {
    root,
    context,
    mounted,
    contribution,
    setFreshness(value) {
      freshness = value;
      mounted.controller.revalidate();
    }
  };
}

/** @returns Stable fixture object target with canonical client geometry. */
function fixtureTarget(): ClassicEditorObjectTarget {
  return {
    id: "fixture-object",
    ownerId: "fixture-owner",
    revision: "fixture-v1",
    kind: "fixture",
    label: { en: "Selected fixture", "zh-CN": "已选示例对象" },
    anchor: {
      status: "ready",
      coordinateSpace: "client",
      snapshotVersion: 1,
      kind: "node",
      nodeId: "fixture-object",
      rects: [{ x: 280, y: 280, width: 260, height: 160 }],
      referenceRect: { x: 280, y: 280, width: 260, height: 160 },
      sourceTargetIds: ["fixture-object"]
    }
  };
}

/**
 * Creates an action and Inspector fixture without feature-specific semantics.
 *
 * @param target - Exact retained target.
 * @param freshness - Exact owner freshness resolver.
 * @returns Direct object contribution.
 */
function fixtureContribution(
  target: ClassicEditorObjectTarget,
  freshness: () => ClassicEditorObjectFreshness
): ClassicEditorObjectWorkspaceContribution {
  const actions = Array.from({ length: 9 }, (_, index) => directAction(`action-${index}`, index));
  const commitWidth = directAction("commit-width", 100);
  const resetWidth = directAction("reset-width", 101);
  const commitMode = directAction("commit-mode", 102);
  return {
    id: "fixture-object-workspace",
    target,
    resolveTarget: () => ({ target, freshness: freshness() }),
    actions: actions.map((action, index) => ({
      action,
      rank: index,
      prominence: index > 6 ? "overflow" : "primary",
      presentation: index === 1 ? () => ({ mixed: true }) : undefined
    })),
    inspector: {
      title: { en: "Fixture properties", "zh-CN": "示例属性" },
      tabs: [
        { id: "layout", label: { en: "Layout", "zh-CN": "布局" }, order: 0 },
        { id: "accessibility", label: { en: "Accessibility", "zh-CN": "无障碍" }, order: 1 }
      ],
      sections: [
        {
          id: "geometry",
          tabId: "layout",
          title: { en: "Geometry", "zh-CN": "几何" },
          fields: [
            {
              id: "width",
              label: { en: "Width", "zh-CN": "宽度" },
              kind: "number",
              value: null,
              mixed: true,
              unit: "px",
              min: 1,
              max: 1000,
              step: 1,
              validation: {
                code: "mixed-width",
                message: { en: "Enter one width to replace mixed values.", "zh-CN": "输入宽度以替换混合值。" }
              },
              commit: commitWidth,
              reset: resetWidth
            },
            {
              id: "mode",
              label: { en: "Mode", "zh-CN": "模式" },
              kind: "choice",
              value: "inline",
              mixed: false,
              choices: [
                { value: "inline", label: { en: "Inline", "zh-CN": "嵌入" } },
                { value: "float", label: { en: "Float", "zh-CN": "浮动" } }
              ],
              commit: commitMode
            }
          ],
          actions: [actions[0]!],
          actionInput: Object.freeze({ source: "inspector" })
        },
        {
          id: "alt",
          tabId: "accessibility",
          title: { en: "Description", "zh-CN": "说明" },
          fields: []
        }
      ]
    }
  };
}

/** @param id - Stable action id. @param order - Stable action order. @returns Direct command action. */
function directAction(id: string, order: number): ClassicEditorActionDefinition {
  return {
    id,
    label: { en: `Action ${order + 1}`, "zh-CN": `操作 ${order + 1}` },
    icon: "table",
    order,
    canExecute: ({ editor }) => editor.isEditable,
    disabledReason: () => ({
      code: "fixture-read-only",
      message: { en: "The fixture is read-only.", "zh-CN": "示例为只读。" }
    }),
    run: ({ editor, payload }) => (
      (editor.commands as unknown as { setFixture(value: unknown): boolean })
        .setFixture(payload)
    )
  };
}

/** @param x - Left. @param y - Top. @param width - Width. @param height - Height. @returns DOMRect fixture. */
function rect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
    width,
    height,
    toJSON: () => ({})
  } as DOMRect;
}
