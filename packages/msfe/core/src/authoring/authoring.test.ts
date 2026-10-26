import { describe, expect, it } from "vitest";
import { Extension, Mark, Node } from "./definition";
import { compileExtensions } from "../extensions/compile";

describe("extension authoring inheritance", () => {
  it("deeply configures without changing the parent, replaces arrays, and retains inherited hooks", () => {
    const base = Node.create({ name: "asset", addOptions() {
      return { theme: { size: 12, colors: ["red"], nested: { enabled: true } }, label: "base" };
    } });
    const child = base.configure({ theme: { size: 16 } }).extend({
      addOptions() { return { ...this.parent!(), label: "child" }; },
    }).configure({ theme: { colors: ["blue"] } });
    expect(child.type).toBe("node");
    expect(child.name).toBe("asset");
    expect(child.options).toEqual({ theme: { size: 16, colors: ["blue"], nested: { enabled: true } }, label: "child" });
    expect(base.options.theme).toEqual({ size: 12, colors: ["red"], nested: { enabled: true } });
  });

  it("binds every parent method to the final name/options and allocates editor-local storage", () => {
    const calls: string[] = [];
    const base = Extension.create<{ value: number }, { items: number[] }>({ name: "base", addOptions: () => ({ value: 1 }),
      addStorage() { return { items: [this.options.value] }; },
      onCreate() { calls.push(`${this.name}:${this.options.value}`); this.storage.items.push(2); },
    });
    const child = base.extend({ name: "child", onCreate() { this.parent?.(); calls.push("child-hook"); } }).configure({ value: 4 });
    const first = compileExtensions([child]).ordered[0]!;
    const second = compileExtensions([child]).ordered[0]!;
    const a = first.createStorage!() as { items: number[] };
    const b = second.createStorage!() as { items: number[] };
    first.onCreate!({ editor: {} as never, storage: a });
    expect(calls).toEqual(["child:4", "child-hook"]);
    expect(a.items).toEqual([4, 2]);
    expect(b.items).toEqual([4]);
  });

  it("expands configured presets, rejects duplicate names and preserves the family", () => {
    const bold = Mark.create(() => ({ name: "strong" }));
    const kit = Extension.create({ name: "kit", addExtensions() { return [bold]; } });
    expect(compileExtensions([kit]).ordered.map(item => item.id)).toEqual(["kit", "strong"]);
    expect(bold.configure({}).extend({}).type).toBe("mark");
    expect(() => compileExtensions([kit, bold])).toThrow("duplicate-extension: strong");
  });

  it("fails explicitly for schema contracts the source engine cannot enforce", () => {
    expect(() => Node.create({ name: "container", content: "paragraph+" } as never)).toThrow("unsupported-extension-field: content");
  });

  it("inherits and configures semantic editing boundaries through the public extension hook", () => {
    const base = Node.create({ name: "custom", addOptions: () => ({ owner: "CustomBlock" }),
      addEditingBoundaries() { return [{ nodes: [this.options.owner], resolve: () => null }]; },
    });
    const child = base.configure({ owner: "ConfiguredBlock" }).extend({
      addEditingBoundaries() { return [...this.parent!(), { nodes: ["ExtraBlock"], resolve: () => null }]; },
    });
    expect(compileExtensions([child]).ordered[0]!.editingBoundaries!.map(rule => rule.nodes)).toEqual([["ConfiguredBlock"], ["ExtraBlock"]]);
    expect(compileExtensions([base]).ordered[0]!.editingBoundaries!.map(rule => rule.nodes)).toEqual([["CustomBlock"]]);
  });
});
