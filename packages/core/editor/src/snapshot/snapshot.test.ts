import { describe, expect, it, vi } from "vitest";
import { Plugin, PluginKey } from "@quirekit/pm";
import { QuireEditor } from "../Editor";
import { Extension } from "../extension";

describe("read-only editor snapshots", () => {
  it("isolates state, storage, provider plugins, host callbacks and lifecycle", () => {
    const create = vi.fn();
    const destroy = vi.fn();
    const update = vi.fn();
    const initializeProvider = vi.fn(() => 1);
    const providerKey = new PluginKey("snapshot-provider");
    const source = new QuireEditor({
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "live" }] }] },
      onUpdate: update,
      extensions: [Extension.create({
        name: "live-provider",
        addStorage: () => ({ connected: true }),
        onCreate: create,
        onDestroy: destroy,
        addProseMirrorPlugins: () => [new Plugin({
          key: providerKey, state: { init: initializeProvider, apply: (_tr, value) => value }
        })]
      })]
    });
    const before = source.state.pm;
    const snapshot = source.createReadOnlySnapshot();
    expect(snapshot.isEditable).toBe(false);
    expect(snapshot.schema).toBe(source.schema);
    expect(snapshot.extensionManager.schema).toBe(source.schema);
    expect(snapshot.state.doc).toBe(source.state.doc);
    expect(snapshot.state.pm).not.toBe(before);
    expect(snapshot.storage["live-provider"]).toBeUndefined();
    expect(providerKey.getState(snapshot.state.pm)).toBeUndefined();
    expect(initializeProvider).toHaveBeenCalledTimes(1);
    snapshot.commands.insertContent("snapshot only");
    expect(source.state.pm).toBe(before);
    expect(update).not.toHaveBeenCalled();
    snapshot.destroy();
    expect(create).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
    expect(source.isDestroyed).toBe(false);
    source.commands.insertContent("still connected");
    expect(update).toHaveBeenCalledTimes(1);
    source.destroy();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("captures a supplied document and excludes source adapters", () => {
    const adapters = vi.fn(() => []);
    const profile = Object.freeze({ layout: "pure" });
    const profiles = vi.fn(() => [{ id: "pages", facets: ["page-model"], profile }]);
    const source = new QuireEditor({ extensions: [Extension.create({
      name: "presentation", addDocumentProfiles: profiles, addViewAdapters: adapters
    })] });
    profiles.mockClear();
    adapters.mockClear();
    const document = source.schema.node("doc", null, [source.schema.node("paragraph", null, source.schema.text("result"))]);
    const snapshot = source.createReadOnlySnapshot({ document });
    expect(snapshot.getText()).toBe("result");
    expect(source.getText()).toBe("");
    expect(snapshot.extensionManager.viewAdapters).toEqual([]);
    expect(snapshot.extensionManager.documentProfileRegistry?.getByFacet("page-model")?.profile).toBe(profile);
    expect(profiles).not.toHaveBeenCalled();
    expect(adapters).not.toHaveBeenCalled();
    const other = new QuireEditor();
    expect(() => source.createReadOnlySnapshot({ document: other.state.doc })).toThrow(/schema/u);
    snapshot.destroy(); source.destroy(); other.destroy();
  });
});
