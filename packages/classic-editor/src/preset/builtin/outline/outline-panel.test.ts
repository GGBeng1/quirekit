// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowReactive } from "vue";
import { Extension, QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import type { QuireKitTreeNode } from "@quirekit/ui";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorRenderContext } from "@classic/types";
import Panel from "./outline-panel.vue";

const probe = vi.hoisted(() => ({ mounts: 0, nodes: [] as (readonly QuireKitTreeNode[])[], props: {} as Record<string, unknown> }));
vi.mock("@quirekit/ui/vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    QuireEmptyState: defineComponent({ setup: () => () => h("p", "Empty") }),
    QuireTreeView: defineComponent({ props: ["nodes", "expandedValue", "selectedValue"],
      setup(props, { attrs, emit }) {
        probe.mounts += 1;
        /** @param nodes - Current tree hierarchy. @returns Buttons exposing stable occurrence keys. */
        const buttons = (nodes: readonly QuireKitTreeNode[]): ReturnType<typeof h>[] => nodes.flatMap(node => [
          h("button", { key: node.id, "data-id": node.id, onClick: () => emit("selectionChange", {
            selectedValue: [node.id], focusedValue: node.id
          }) }, node.label), ...buttons(node.children ?? [])
        ]);
        return () => {
          probe.nodes.push(props.nodes);
          probe.props = { ...props, ...attrs };
          return h("div", buttons(props.nodes));
        };
      }
    })
  };
});

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).reverse().forEach(dispose => dispose());
  probe.mounts = 0; probe.nodes.length = 0; probe.props = {};
});

/** @param dynamicLevel - Optional dynamic extension classification. @returns Real editor with a retained outline surface. */
function mountPanel(dynamicLevel?: () => number | undefined) {
  const extensions = [StarterKit, ...(dynamicLevel === undefined ? [] : [Extension.create({
    name: "dynamicOutline", addNodeCanvasTextStyles() { return { paragraph: () => {
      const level = dynamicLevel();
      return level === undefined ? {} : { documentOutlineLevel: level };
    } }; }
  })])];
  const editor = new QuireEditor({ extensions, content: "<p>prefix</p><h1>Heading A</h1><h2>Heading B</h2>" });
  const host = document.createElement("div");
  const state = shallowReactive({ context: { editor, locale: "en" } as ClassicEditorRenderContext });
  const app = createApp(defineComponent({ setup: () => () => h(Panel, { state }) }));
  app.mount(host);
  let mounted = true;
  /** Releases subscriptions without destroying the editor used for late-event checks. */
  function dispose(): void { if (mounted) { mounted = false; app.unmount(); } }
  cleanup.push(() => { dispose(); editor.destroy(); });
  return { editor, state, host, dispose, refresh: async () => { state.context = { ...state.context }; await nextTick(); } };
}

it("does not remount or replace tree nodes while typing before headings and navigates current positions", async () => {
  const fixture = mountPanel();
  const nodes = probe.nodes[0]!;
  const first = fixture.host.querySelector("button")!;
  fixture.editor.commands.setTextSelection(1);
  for (const letter of "abcdefghijklmnopqrst") {
    fixture.editor.commands.insertContent(letter);
    await fixture.refresh();
  }
  expect(probe.mounts).toBe(1);
  expect(probe.nodes.every(value => value === nodes)).toBe(true);
  expect(fixture.host.querySelector("button")).toBe(first);
  first.click();
  let expected = 0;
  fixture.editor.state.doc.descendants((node, position) => {
    if (node.type.name === "heading" && node.textContent === "Heading A") expected = position + 1;
  });
  expect(fixture.editor.state.pm.selection.head).toBe(expected);
});

it("preserves controlled collapse and selection, prunes deleted values and expands new branches", async () => {
  const fixture = mountPanel();
  const rootId = probe.nodes[0]![0]!.id;
  const childId = probe.nodes[0]![0]!.children![0]!.id;
  expect(probe.props.expandedValue).toEqual([rootId]);
  (probe.props.onExpandedChange as (details: unknown) => void)({ expandedValue: [], focusedValue: rootId });
  fixture.host.querySelectorAll("button")[1]!.click();
  await fixture.refresh();
  expect(probe.props.expandedValue).toEqual([]);
  expect(probe.props.selectedValue).toEqual([childId]);
  fixture.editor.commands.insertContentAt(1, "x");
  await fixture.refresh();
  expect(probe.props.expandedValue).toEqual([]);
  expect(probe.props.selectedValue).toEqual([childId]);
  fixture.editor.commands.replaceDocument("<h1>New root</h1><h2>New child</h2>");
  await fixture.refresh();
  expect(probe.props.selectedValue).toEqual([]);
  expect(probe.props.expandedValue).toEqual([probe.nodes.at(-1)![0]!.id]);
  expect(probe.mounts).toBe(1);
});

it("reclassifies dynamic extension closures without a document change", async () => {
  let level: number | undefined;
  const fixture = mountPanel(() => level);
  const document = fixture.editor.state.doc;
  expect(probe.nodes.at(-1)?.[0]?.label).toBe("Heading A");
  level = 1;
  await fixture.refresh();
  expect(fixture.editor.state.doc).toBe(document);
  expect(probe.nodes.at(-1)?.[0]?.label).toBe("prefix");
  level = undefined;
  await fixture.refresh();
  expect(probe.nodes.at(-1)?.[0]?.label).toBe("Heading A");
});

it("replaces editor subscriptions and clears old controlled identities before accepting new navigation", async () => {
  const fixture = mountPanel();
  const oldId = probe.nodes[0]![0]!.id;
  fixture.host.querySelector("button")!.click();
  await fixture.refresh();
  const off = vi.spyOn(fixture.editor, "off");
  const replacement = new QuireEditor({ extensions: [StarterKit], content: "<h1>Replacement</h1>" });
  cleanup.push(() => replacement.destroy());
  const replacementOff = vi.spyOn(replacement, "off");
  fixture.state.context = { ...fixture.state.context, editor: replacement };
  await nextTick();
  expect(off).toHaveBeenCalledWith("transaction", expect.any(Function));
  expect(probe.nodes.at(-1)?.[0]?.id).not.toBe(oldId);
  expect(probe.props.selectedValue).toEqual([]);
  fixture.host.querySelector("button")!.click();
  expect(replacement.state.pm.selection.head).toBe(1);
  fixture.dispose();
  expect(replacementOff).toHaveBeenCalledWith("transaction", expect.any(Function));
  const updates = probe.nodes.length;
  replacement.commands.insertContentAt(1, "late");
  await nextTick();
  expect(probe.nodes).toHaveLength(updates);
});

it("refreshes an empty heading label when locale changes without replacing its occurrence", async () => {
  const fixture = mountPanel();
  fixture.editor.commands.replaceDocument("<h1></h1>");
  await fixture.refresh();
  const before = probe.nodes.at(-1)![0]!;
  fixture.state.context = { ...fixture.state.context, locale: "zh-CN" };
  await nextTick();
  const after = probe.nodes.at(-1)![0]!;
  expect(after.id).toBe(before.id);
  expect(after.label).not.toBe(before.label);
});
