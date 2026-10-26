import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorRenderContext
} from "../../types";
import type { ClassicEditorInsertItemDefinition } from "../../types/insert";
import { ClassicEditorInsertCatalog } from "./catalog";
import { createClassicEditorInsertItemFromSuggestion } from "./suggestion";

/**
 * Creates the narrow mounted authority required by direct action state resolution.
 *
 * @returns Stable fake product context.
 */
function context(): ClassicEditorRenderContext {
  return {
    instance: {} as ClassicEditorRenderContext["instance"],
    editor: {} as ClassicEditorRenderContext["editor"],
    root: {} as HTMLElement,
    ownerDocument: {} as Document,
    features: {},
    locale: "zh-CN",
    backend: "canvas",
    ui: {} as ClassicEditorRenderContext["ui"]
  };
}

/**
 * Creates one canonical action and never introduces a string action router.
 *
 * @param id - Stable action id.
 * @param run - Typed action closure.
 * @returns Canonical action definition.
 */
function action(
  id: string,
  run: ClassicEditorActionDefinition["run"] = () => true
): ClassicEditorActionDefinition {
  return {
    id,
    label: { "zh-CN": `中文 ${id}`, en: `English ${id}` },
    order: 100,
    run
  };
}

describe("ClassicEditorInsertCatalog", () => {
  it("searches both locales and distinguishes hidden from preserved unsupported state", () => {
    const items: readonly ClassicEditorInsertItemDefinition[] = [
      {
        id: "link",
        group: "inline",
        action: action("link"),
        description: { "zh-CN": "网页目标", en: "Web destination" },
        keywords: [{ "zh-CN": "超链接", en: "Hyperlink" }]
      },
      {
        id: "preserved-diagram",
        group: "media",
        action: { ...action("diagram"), isAvailable: () => false },
        capability: () => ({ mode: "preserved-readonly" })
      },
      {
        id: "hidden-marketplace",
        group: "control",
        action: action("marketplace"),
        capability: () => ({ mode: "hidden" })
      }
    ];
    const catalog = new ClassicEditorInsertCatalog({ items });

    expect(catalog.resolve(context(), { locale: "zh-CN", value: "hyperlink" }))
      .toMatchObject([{ definition: { id: "link" }, canExecute: true }]);
    expect(catalog.resolve(context(), { locale: "en", value: "", group: "media" }))
      .toMatchObject([{
        definition: { id: "preserved-diagram" },
        capability: "preserved-readonly",
        canExecute: false,
        reason: "Preserved, but not currently authorable"
      }]);
    expect(catalog.resolve(context(), { locale: "en", value: "marketplace" }))
      .toEqual([]);
  });

  it("records instance-local recent use only after a successful retained action receipt", async () => {
    const success = vi.fn(() => true);
    const failure = vi.fn(() => false);
    const successfulItem = {
      id: "table",
      group: "structure" as const,
      action: action("table", success)
    };
    const failedItem = {
      id: "image",
      group: "media" as const,
      action: action("image", failure)
    };
    const first = new ClassicEditorInsertCatalog({
      items: [successfulItem, failedItem]
    });
    const second = new ClassicEditorInsertCatalog({
      items: [successfulItem, failedItem]
    });

    await expect(first.execute(failedItem, context())).resolves.toBe(false);
    expect(first.recentDefinitions).toEqual([]);
    await expect(first.execute(successfulItem, context())).resolves.toBe(true);
    expect(success).toHaveBeenCalledOnce();
    expect(first.recentDefinitions).toEqual([successfulItem]);
    expect(second.recentDefinitions).toEqual([]);
  });

  it("keeps disabled reasons visible and never invokes an inapplicable command", async () => {
    const run = vi.fn(() => true);
    const disabled = {
      id: "protected-control",
      group: "control" as const,
      action: {
        ...action("protected-control", run),
        canExecute: () => false,
        disabledReason: () => ({
          code: "selection-protected",
          message: { "zh-CN": "当前区域受保护", en: "The current area is protected" }
        })
      }
    };
    const catalog = new ClassicEditorInsertCatalog({ items: [disabled] });

    expect(catalog.resolve(context(), { locale: "zh-CN", value: "" }))
      .toMatchObject([{ canExecute: false, reason: "当前区域受保护" }]);
    await expect(catalog.execute(disabled, context())).resolves.toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("projects SuggestionController result facts without replacing their typed action", () => {
    const canonicalAction = action("slash-table");
    const projected = createClassicEditorInsertItemFromSuggestion({
      result: {
        id: "suggestion-table",
        label: "快速表格",
        keywords: ["grid"],
        action: canonicalAction
      },
      projection: { group: "structure", presentation: "gallery" }
    });

    expect(projected.action).toBe(canonicalAction);
    expect(projected).toMatchObject({
      id: "suggestion-table",
      group: "structure",
      presentation: "gallery",
      keywords: ["快速表格", "grid"]
    });
  });

  it("rejects duplicate discovery identities before any surface mounts", () => {
    expect(() => new ClassicEditorInsertCatalog({
      items: [
        { id: "duplicate", group: "inline", action: action("first") },
        { id: "duplicate", group: "media", action: action("second") }
      ]
    })).toThrow(/must be unique/);
  });
});
