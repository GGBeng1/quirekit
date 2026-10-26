import type {
  ClassicEditorHostAcquireResult,
  ClassicEditorImportContext,
  ClassicEditorPreset
} from "../types";
import type { QuireEditorPasteEvent } from "@quirekit/core";
import { createTheme } from "@quirekit/ui";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => {
  const document = {
    type: "doc",
    content: [{ type: "paragraph" }]
  };
  const fontLibrary = {};
  const readiness = {
    status: {
      requestedFamily: "Fixture Serif",
      renderedFamily: "Fixture Serif",
      status: "available",
      source: "requested"
    },
    fontLibrary,
    update: vi.fn(),
    destroy: vi.fn()
  };
  const workspaceViewport = {
    scrollTo: vi.fn()
  };
  return {
    document,
    fontLibrary,
    readiness,
    createFontReadiness: vi.fn(() => readiness),
    workspaceViewport,
    mountResources: vi.fn((options: {
      readonly document: unknown;
      readonly onPaste: unknown;
    }) => ({
      editor: {
        extensions: [],
        isDestroyed: false,
        isEditable: true,
        state: { doc: options.document, pm: {} },
        mountedView: { setHiddenTextViewMode: vi.fn() },
        view: { refreshFontMetrics: vi.fn(), updateState: vi.fn() },
        getJSON: vi.fn(() => options.document)
      },
      shell: {
        root: {},
        workspaceViewport,
        update: vi.fn()
      }
    })),
    releaseResources: vi.fn((resources: {
      readonly editor: { readonly getJSON: () => unknown };
    }) => resources.editor.getJSON())
  };
});

vi.mock("./document-fonts", () => ({
  createClassicEditorDocumentFontReadiness: runtimeMocks.createFontReadiness,
  gateClassicEditorFirstPaint: () => () => undefined
}));

vi.mock("./mount", () => ({
  mountClassicEditorResources: runtimeMocks.mountResources,
  releaseClassicEditorResources: runtimeMocks.releaseResources
}));

import { ClassicEditorRuntime } from "./runtime";
import {
  createHostTestAcquireIntent,
  createHostTestDeferred,
  createHostTestServices
} from "./host-resource/test-fixtures";

const fixturePreset: ClassicEditorPreset = {
  id: "font-lifecycle-fixture",
  features: {},
  resolveExtensions: () => []
};

/** @param context - Lifecycle fixture, whose fake Core accepts one state without parsing document content. */
function commitFixtureImport(context: ClassicEditorImportContext): void {
  context.commit(() => { Object.assign(context.editor.state, { pm: {} }); return true; });
}

describe("Classic Editor font lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets hidden-text presentation once without document work and preserves it across remounts", () => {
    const runtime = new ClassicEditorRuntime({ document: runtimeMocks.document, preset: fixturePreset });
    const host = { ownerDocument: {} as Document } as HTMLElement;
    runtime.mount(host);
    try {
      const resources = runtimeMocks.mountResources.mock.results.at(-1)!.value;
      runtime.ui.setHiddenTextVisible(true);
      runtime.ui.setHiddenTextVisible(true);
      runtime.ui.setRulerVisible(false);
      expect(resources.editor.mountedView.setHiddenTextViewMode).toHaveBeenCalledExactlyOnceWith("formatting-inspection");
      expect(resources.editor.getJSON).not.toHaveBeenCalled();
      expect(runtimeMocks.mountResources).toHaveBeenCalledTimes(1);
      runtime.update({ locale: "en", view: { backend: "svg" } });
      expect(runtime.ui.state.hiddenTextVisible).toBe(true);
      expect(runtimeMocks.mountResources.mock.lastCall![0]).toMatchObject({ hiddenTextViewMode: "formatting-inspection" });
      runtime.update({ svgRuntime: { hiddenTextViewMode: "normal" } });
      expect(runtime.ui.state.hiddenTextVisible).toBe(false);
      expect(runtimeMocks.mountResources.mock.lastCall![0]).toMatchObject({ hiddenTextViewMode: "normal" });
    } finally { runtime.destroy(); }
  });

  it("honors initial backend presentation and isolates instance preferences before mount", () => {
    const first = new ClassicEditorRuntime({ document: runtimeMocks.document, preset: fixturePreset,
      view: { backend: "svg" }, svgRuntime: { hiddenTextViewMode: "formatting-inspection" } });
    const second = new ClassicEditorRuntime({ document: runtimeMocks.document, preset: fixturePreset });
    try {
      expect(first.ui.state.hiddenTextVisible).toBe(true);
      expect(second.ui.state.hiddenTextVisible).toBe(false);
      first.ui.setHiddenTextVisible(false);
      second.ui.setHiddenTextVisible(true);
      first.mount({ ownerDocument: {} as Document } as HTMLElement);
      expect(runtimeMocks.mountResources.mock.lastCall![0]).toMatchObject({ hiddenTextViewMode: "normal" });
      expect(second.ui.state.hiddenTextVisible).toBe(true);
    } finally { first.destroy(); second.destroy(); }
  });

  it("passes resolved theme snapshots to contribution contexts across theme updates", () => {
    const initialTheme = createTheme({ sources: { primary: "#246b55" } });
    const nextTheme = createTheme({ scheme: "dark", sources: { primary: "#8246ab" } });
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document, preset: fixturePreset, theme: initialTheme
    });
    runtime.mount({ ownerDocument: {} as Document } as HTMLElement);
    try {
      const firstResources = runtimeMocks.mountResources.mock.results.at(-1)!.value;
      const initialContext = firstResources.shell.update.mock.lastCall![0];
      expect(initialContext.theme).toBe(initialTheme);
      runtime.update({ theme: nextTheme });
      const nextResources = runtimeMocks.mountResources.mock.results.at(-1)!.value;
      expect(nextResources.shell.update.mock.lastCall![0].theme).toBe(nextTheme);
      expect(initialContext.theme).toBe(initialTheme);
    } finally {
      runtime.destroy();
    }
  });

  it("owns one editable document name across import, export, and locale updates", async () => {
    const importDocument = vi.fn(commitFixtureImport);
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: fixturePreset,
      plugins: [{
        id: "fixture.document-name",
        services: [{
          id: "fixture-json",
          label: "Fixture JSON",
          format: {
            id: "json",
            extensions: [".json"],
            mimeTypes: ["application/json"]
          },
          import: importDocument,
          export: () => ({
            data: "{}",
            fileName: "document.json",
            mimeType: "application/json"
          })
        }]
      }]
    });
    runtime.mount({ ownerDocument: {} as Document } as HTMLElement);

    expect(runtime.documentName).toBe("未命名文档");
    runtime.setDocumentName("  Product brief  ");
    expect(runtime.documentName).toBe("Product brief");

    await runtime.importDocument("fixture-json", {
      data: "{}",
      fileName: "Quarterly.Report.JSON"
    });
    expect(runtime.documentName).toBe("Quarterly.Report");
    await expect(runtime.exportDocument("fixture-json")).resolves.toMatchObject({
      fileName: "Quarterly.Report.json"
    });

    runtime.update({ locale: "en" });
    expect(runtime.documentName).toBe("Quarterly.Report");
    runtime.setDocumentName("  ");
    expect(runtime.documentName).toBe("Untitled document");
    runtime.destroy();
  });

  it("preserves live sidebar choices unless visibility is explicitly updated", () => {
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document, preset: fixturePreset,
      shell: { leftSidebar: true, rightSidebar: false }
    });
    runtime.mount({ ownerDocument: {} as Document } as HTMLElement);
    try {
      runtime.ui.closeSidebar("left");
      runtime.ui.openSidebarPanel("right", "fixture.paragraph", { targetId: "paragraph-1" });
      const previous = runtime.ui.state;
      runtime.update({ theme: createTheme({ scheme: "dark" }) });
      expect(runtime.ui.state.leftSidebar).toEqual(previous.leftSidebar);
      expect(runtime.ui.state.rightSidebar).toEqual(previous.rightSidebar);
      runtime.update({ locale: "en", view: { backend: "svg" } });
      expect(runtime.ui.state.rightSidebar).toEqual(previous.rightSidebar);
      runtime.update({ shell: { leftSidebar: true, rightSidebar: false } });
      expect(runtime.ui.state.leftSidebar.visible).toBe(true);
      expect(runtime.ui.state.rightSidebar).toEqual({ ...previous.rightSidebar, visible: false });
      runtime.update({ theme: createTheme({ scheme: "light" }) });
      expect(runtime.ui.state.rightSidebar.visible).toBe(false);
    } finally {
      runtime.destroy();
    }
  });

  it("refreshes selection UI and hooks without reserializing an unchanged document", () => {
    const onUpdate = vi.fn();
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: {
        ...fixturePreset,
        plugins: [{ id: "fixture.update-observer", onUpdate }]
      }
    });
    runtime.mount({ ownerDocument: {} as Document } as HTMLElement);
    const resources = runtimeMocks.mountResources.mock.results.at(-1)!.value;
    const options = runtimeMocks.mountResources.mock.lastCall![0] as unknown as {
      readonly onEditorUpdate: () => void;
    };
    resources.editor.getJSON.mockClear();
    resources.shell.update.mockClear();
    runtimeMocks.readiness.update.mockClear();

    for (let index = 0; index < 60; index += 1) options.onEditorUpdate();

    expect(resources.editor.getJSON).not.toHaveBeenCalled();
    expect(runtimeMocks.readiness.update).not.toHaveBeenCalled();
    expect(resources.shell.update).toHaveBeenCalledTimes(60);
    expect(onUpdate).toHaveBeenCalledTimes(60);
    runtime.destroy();
  });

  it("refreshes document data once per new snapshot and resets across remounts", () => {
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: fixturePreset
    });
    const host = { ownerDocument: {} as Document } as HTMLElement;
    runtime.mount(host);
    const resources = runtimeMocks.mountResources.mock.results.at(-1)!.value;
    const options = runtimeMocks.mountResources.mock.lastCall![0] as unknown as {
      readonly onEditorUpdate: () => void;
    };
    const changedDocument = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Changed" }] }]
    };
    resources.editor.state.doc = changedDocument;
    resources.editor.getJSON.mockReturnValue(changedDocument);
    resources.editor.getJSON.mockClear();
    runtimeMocks.readiness.update.mockClear();

    options.onEditorUpdate();
    options.onEditorUpdate();

    expect(resources.editor.getJSON).not.toHaveBeenCalled();
    expect(runtimeMocks.readiness.update).toHaveBeenCalledExactlyOnceWith(changedDocument);
    runtime.unmount();
    expect(runtime.getJSON()).toEqual(changedDocument);
    runtime.mount(host);
    const remounted = runtimeMocks.mountResources.mock.results.at(-1)!.value;
    expect(remounted.editor).not.toBe(resources.editor);
    expect(remounted.editor.getJSON).not.toHaveBeenCalled();
    expect(runtime.getJSON()).toEqual(changedDocument);
    runtime.destroy();
  });

  it("retains registered fonts while remounting a different View backend", () => {
    const ownerDocument = {} as Document;
    const host = { ownerDocument } as HTMLElement;
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: fixturePreset,
      view: { backend: "canvas" }
    });

    runtime.mount(host);
    const fontLibrary = runtime.fontLibrary;
    runtime.update({ view: { backend: "svg" } });

    expect(runtime.backend).toBe("svg");
    expect(runtime.fontLibrary).toBe(fontLibrary);
    expect(runtimeMocks.createFontReadiness).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.readiness.update).toHaveBeenCalledWith(runtimeMocks.document);
    expect(runtimeMocks.readiness.destroy).not.toHaveBeenCalled();

    runtime.destroy();
    expect(runtimeMocks.readiness.destroy).toHaveBeenCalledTimes(1);
  });

  it("retains one default media repository across backend remounts", async () => {
    const ownerDocument = {} as Document;
    const host = { ownerDocument } as HTMLElement;
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: fixturePreset
    });
    const media = runtime.media;
    const reference = media.sink.put({
      assetId: media.createAssetId("image"),
      kind: "image",
      mimeType: "image/png",
      bytes: Uint8Array.from([1])
    });

    runtime.mount(host);
    runtime.update({ view: { backend: "svg" } });

    expect(runtime.media).toBe(media);
    expect(await runtime.media.resolver.resolve(reference)).toMatchObject({
      reference,
      mimeType: "image/png"
    });
    runtime.destroy();
  });

  it("retains one create-time Host coordinator across update and remount", async () => {
    const host = createHostTestServices({
      acquire: async ({ intent }) => ({
        kind: "acquire",
        jobId: intent.jobId,
        operationId: intent.operationId,
        attempt: intent.attempt,
        generation: intent.generation,
        outcome: "cancelled"
      })
    });
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: fixturePreset,
      host
    });
    const coordinator = runtime.hostResources;
    const mountHost = { ownerDocument: {} as Document } as HTMLElement;

    runtime.mount(mountHost);
    runtime.update({ view: { backend: "svg" } });

    expect(runtime.hostResources).toBe(coordinator);
    await expect(coordinator.start(createHostTestAcquireIntent())).resolves
      .toMatchObject({ outcome: "cancelled" });
    runtime.destroy();
  });

  it("aborts instance-owned Host work during final destroy", async () => {
    const deferred = createHostTestDeferred<ClassicEditorHostAcquireResult>();
    let signal: AbortSignal | undefined;
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: fixturePreset,
      host: createHostTestServices({
        acquire: (request) => {
          signal = request.signal;
          return deferred.promise;
        }
      })
    });
    const intent = createHostTestAcquireIntent();
    const pending = runtime.hostResources.start(intent);

    runtime.destroy();

    expect(signal?.aborted).toBe(true);
    expect(runtime.hostResources.snapshot?.result?.outcome).toBe("cancelled");
    deferred.resolve({
      kind: "acquire",
      jobId: intent.jobId,
      operationId: intent.operationId,
      attempt: intent.attempt,
      generation: intent.generation,
      outcome: "cancelled"
    });
    await expect(pending).resolves.toBeNull();
  });

  it("routes paste through product plugins until the first claimant", () => {
    const firstPaste = vi.fn(() => true);
    const laterPaste = vi.fn(() => true);
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: {
        ...fixturePreset,
        plugins: [
          { id: "fixture.first-paste", onPaste: firstPaste },
          { id: "fixture.later-paste", onPaste: laterPaste }
        ]
      }
    });
    const host = { ownerDocument: {} as Document } as HTMLElement;
    const preventDefault = vi.fn();

    runtime.mount(host);
    const mountOptions = runtimeMocks.mountResources.mock.lastCall?.[0] as {
      readonly onPaste: (event: QuireEditorPasteEvent) => void;
    };
    mountOptions.onPaste({
      editor: runtime.editor,
      event: { preventDefault } as unknown as ClipboardEvent,
      slice: {}
    } as unknown as QuireEditorPasteEvent);

    expect(firstPaste).toHaveBeenCalledOnce();
    expect(laterPaste).not.toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalledOnce();
    runtime.destroy();
  });

  it("resets the workspace after every successful document import", async () => {
    let resolveFirstImport: (() => void) | undefined;
    const importDocument = vi.fn()
      .mockImplementationOnce((context: ClassicEditorImportContext) => new Promise<void>((resolve) => {
        resolveFirstImport = () => { commitFixtureImport(context); resolve(); };
      }))
      .mockImplementationOnce(commitFixtureImport)
      .mockRejectedValueOnce(new SyntaxError("Invalid fixture document."));
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: {
        ...fixturePreset,
        plugins: [{
          id: "fixture.import-service",
          services: [{
            id: "fixture",
            label: "Fixture",
            format: {
              id: "fixture",
              extensions: [".fixture"],
              mimeTypes: ["application/x-fixture"]
            },
            import: importDocument
          }]
        }]
      }
    });
    const host = { ownerDocument: {} as Document } as HTMLElement;
    runtime.mount(host);

    const firstImport = runtime.importDocument("fixture", {
      data: "first",
      fileName: "first.fixture"
    });
    expect(runtimeMocks.workspaceViewport.scrollTo).not.toHaveBeenCalled();
    resolveFirstImport?.();
    await firstImport;
    expect(runtimeMocks.workspaceViewport.scrollTo).toHaveBeenLastCalledWith({ top: 0 });

    await runtime.importDocument("fixture", {
      data: "second",
      fileName: "second.fixture"
    });
    expect(runtimeMocks.workspaceViewport.scrollTo).toHaveBeenCalledTimes(2);

    await expect(runtime.importDocument("fixture", {
      data: "broken",
      fileName: "broken.fixture"
    })).rejects.toThrow("Invalid fixture document.");
    expect(runtimeMocks.workspaceViewport.scrollTo).toHaveBeenCalledTimes(2);
    runtime.destroy();
  });

  it("isolates two mounted product instances and their reusable resources", () => {
    const firstDocument = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "first" }]
      }]
    };
    const secondDocument = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "second" }]
      }]
    };
    const first = new ClassicEditorRuntime({
      document: firstDocument,
      preset: fixturePreset
    });
    const second = new ClassicEditorRuntime({
      document: secondDocument,
      preset: fixturePreset
    });
    const ownerDocument = {} as Document;
    const firstHost = { ownerDocument } as HTMLElement;
    const secondHost = { ownerDocument } as HTMLElement;

    expect(first.media).not.toBe(second.media);
    expect(first.registry).not.toBe(second.registry);
    expect(first.ui).not.toBe(second.ui);

    first.mount(firstHost);
    second.mount(secondHost);
    const firstEditor = first.editor;
    const secondEditor = second.editor;

    expect(firstEditor).toBeDefined();
    expect(secondEditor).toBeDefined();
    expect(firstEditor).not.toBe(secondEditor);
    expect(first.getJSON()).toEqual(firstDocument);
    expect(second.getJSON()).toEqual(secondDocument);

    first.ui.openSidebarPanel("left", "first-panel");
    expect(first.ui.state.leftSidebar.activePanelId).toBe("first-panel");
    expect(second.ui.state.leftSidebar.activePanelId).not.toBe("first-panel");

    first.unmount();
    expect(first.isMounted).toBe(false);
    expect(second.isMounted).toBe(true);
    expect(second.editor).toBe(secondEditor);

    first.mount(firstHost);
    expect(first.getJSON()).toEqual(firstDocument);
    first.destroy();

    expect(first.isDestroyed).toBe(true);
    expect(second.isMounted).toBe(true);
    expect(second.editor).toBe(secondEditor);
    expect(second.getJSON()).toEqual(secondDocument);
    second.destroy();
  });

  it("keeps developer lifecycle hooks outside the default user runtime", () => {
    const onCreate = vi.fn();
    const onMount = vi.fn();
    const developerPlugin = {
      id: "fixture.developer",
      audience: "developer" as const,
      onCreate,
      onMount
    };
    const user = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: { ...fixturePreset, plugins: [developerPlugin] }
    });

    expect(user.registry.surfaceMode).toBe("user");
    expect(user.registry.plugins).toEqual([]);
    expect(onCreate).not.toHaveBeenCalled();
    user.mount({ ownerDocument: {} as Document } as HTMLElement);
    expect(onMount).not.toHaveBeenCalled();
    user.destroy();
  });

  it("preserves the explicit developer surface and mount lifecycle across locale updates", () => {
    const onCreate = vi.fn();
    const onMount = vi.fn();
    const developerPlugin = {
      id: "fixture.developer",
      audience: "developer" as const,
      onCreate,
      onMount
    };
    const runtime = new ClassicEditorRuntime({
      document: runtimeMocks.document,
      preset: { ...fixturePreset, plugins: [developerPlugin] },
      surfaceMode: "developer"
    });
    const host = { ownerDocument: {} as Document } as HTMLElement;

    expect(runtime.registry.surfaceMode).toBe("developer");
    expect(runtime.registry.plugins).toEqual([developerPlugin]);
    runtime.mount(host);
    expect(runtime.registry.surfaceMode).toBe("developer");
    runtime.update({ locale: "en" });
    expect(runtime.registry.surfaceMode).toBe("developer");
    expect(runtime.registry.plugins).toEqual([developerPlugin]);
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onMount).toHaveBeenCalledTimes(1);
    runtime.destroy();
  });
});
