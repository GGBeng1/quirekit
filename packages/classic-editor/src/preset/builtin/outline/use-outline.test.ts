// @vitest-environment happy-dom
import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";

const projections = vi.hoisted(() => ({ count: 0 }));
vi.mock("./occurrences", async (importOriginal) => {
  const original = await importOriginal<typeof import("./occurrences")>();
  return {
    createClassicEditorOutlineOccurrences: (...args: Parameters<typeof original.createClassicEditorOutlineOccurrences>) => {
      const registry = original.createClassicEditorOutlineOccurrences(...args);
      return { ...registry, project: (...projectArgs: Parameters<typeof registry.project>) => {
        projections.count += 1;
        return registry.project(...projectArgs);
      } };
    }
  };
});
const { useClassicEditorOutline } = await import("./use-outline");

const observers: Array<(entries: { contentRect: { width: number; height: number } }[]) => void> = [];
afterEach(() => { observers.length = 0; projections.count = 0; vi.unstubAllGlobals(); });

it("keeps the last tree while the panel is hidden and projects once when shown", async () => {
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: (entries: { contentRect: { width: number; height: number } }[]) => void) { observers.push(callback); }
    observe(): void {}
    disconnect(): void {}
  });
  const editor = new QuireEditor({ extensions: [StarterKit], content: { type: "doc", content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] }
  ] } });
  const context = shallowRef({ editor, locale: "en" } as ClassicEditorRenderContext);
  let labels: string[] = [];
  const app = createApp(defineComponent({ setup() {
    const outline = useClassicEditorOutline(context, shallowRef("Untitled"));
    return () => { labels = outline.nodes.value.map(node => node.label); return h("div"); };
  } }));
  app.mount(document.body.appendChild(document.createElement("div")));
  expect(labels).toEqual(["Title"]);
  const shown = projections.count;

  for (const listener of observers) listener([{ contentRect: { width: 0, height: 0 } }]);
  editor.commands.setTextSelection(6);
  editor.commands.insertContent(" one");
  editor.commands.insertContent(" two");
  await nextTick();
  expect(projections.count).toBe(shown);
  expect(labels).toEqual(["Title"]);

  for (const listener of observers) listener([{ contentRect: { width: 240, height: 600 } }]);
  await nextTick();
  expect(projections.count).toBe(shown + 1);
  expect(labels).toEqual(["Title one two"]);
  app.unmount();
  editor.destroy();
});
