import { shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  classicEditorDocumentServiceErrorEvent,
  classicEditorDocumentServiceStartEvent,
  classicEditorDocumentServiceSuccessEvent
} from "@classic/service";
import type {
  ClassicEditorDocumentServiceMenuContribution,
  ClassicEditorRenderContext
} from "@classic/types";
import type { ClassicEditorShellModel } from "../../types";
import { useClassicEditorDocumentServices } from "./document-services";

describe("Classic Editor document-service actions", () => {
  it("identifies the rejected import artifact while preserving the current document", async () => {
    const currentDocument = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Current document" }]
      }]
    };
    const fixture = createImportFixture(async () => {
      throw new SyntaxError("Invalid DOCX package.");
    }, currentDocument);
    let failure: CustomEvent | undefined;
    fixture.root.addEventListener(classicEditorDocumentServiceErrorEvent, (event) => {
      failure = event as CustomEvent;
    });

    const execution = fixture.actions.execute(fixture.contribution);
    fixture.selectFile();
    await execution;

    expect(fixture.eventTypes).toEqual([
      classicEditorDocumentServiceStartEvent,
      classicEditorDocumentServiceErrorEvent
    ]);
    expect(failure?.detail).toMatchObject({
      contribution: { id: "docx.import", operation: "import" },
      fileName: "broken.docx",
      error: {
        name: "SyntaxError",
        message: "Invalid DOCX package."
      }
    });
    expect(fixture.getJSON()).toEqual(currentDocument);
  });

  it("emits lifecycle feedback and keeps the download URL alive past a microtask", async () => {
    const fixture = createExportFixture(async () => ({
      data: Uint8Array.from([0x50, 0x4b]),
      fileName: "document.docx",
      mimeType: "application/docx"
    }));

    await fixture.actions.execute(fixture.contribution);

    expect(fixture.eventTypes).toEqual([
      classicEditorDocumentServiceStartEvent,
      classicEditorDocumentServiceSuccessEvent
    ]);
    expect(fixture.link.click).toHaveBeenCalledOnce();
    expect(fixture.revokeObjectURL).not.toHaveBeenCalled();
    expect(fixture.schedule).toHaveBeenCalledWith(expect.any(Function), 1_000);

    fixture.runScheduled();
    expect(fixture.revokeObjectURL).toHaveBeenCalledWith("blob:document");
  });

  it("emits an actionable error instead of leaving export as a silent no-op", async () => {
    const fixture = createExportFixture(async () => {
      throw new RangeError("A move-with-text drawing cannot use page placement.");
    });
    let failure: CustomEvent | undefined;
    fixture.root.addEventListener(classicEditorDocumentServiceErrorEvent, (event) => {
      failure = event as CustomEvent;
    });

    await fixture.actions.execute(fixture.contribution);

    expect(fixture.eventTypes).toEqual([
      classicEditorDocumentServiceStartEvent,
      classicEditorDocumentServiceErrorEvent
    ]);
    expect(failure?.detail).toMatchObject({
      contribution: { id: "docx.export", operation: "export" },
      error: {
        name: "RangeError",
        message: "A move-with-text drawing cannot use page placement."
      }
    });
    expect(fixture.link.click).not.toHaveBeenCalled();
  });
});

/**
 * Creates one export action with observable DOM and timer boundaries.
 *
 * @param exportDocument - Document-service implementation under test.
 * @returns Action controller, event log, and download controls.
 */
function createExportFixture(
  exportDocument: () => Promise<{
    readonly data: Uint8Array;
    readonly fileName: string;
    readonly mimeType: string;
  }>
) {
  const root = new EventTarget();
  const eventTypes: string[] = [];
  for (const type of [
    classicEditorDocumentServiceStartEvent,
    classicEditorDocumentServiceSuccessEvent,
    classicEditorDocumentServiceErrorEvent
  ]) {
    root.addEventListener(type, (event) => eventTypes.push(event.type));
  }
  const link = {
    click: vi.fn(),
    remove: vi.fn(),
    hidden: false,
    href: "",
    download: ""
  };
  const revokeObjectURL = vi.fn();
  let scheduled: (() => void) | undefined;
  const schedule = vi.fn((callback: () => void) => {
    scheduled = callback;
    return 1;
  });
  const ownerDocument = {
    body: { append: vi.fn() },
    createElement: vi.fn(() => link),
    defaultView: {
      URL: {
        createObjectURL: vi.fn(() => "blob:document"),
        revokeObjectURL
      },
      setTimeout: schedule
    }
  } as unknown as Document;
  const context = {
    ownerDocument,
    root,
    instance: { exportDocument }
  } as unknown as ClassicEditorRenderContext;
  const model = shallowRef({
    context
  } as unknown as ClassicEditorShellModel);
  const contribution: ClassicEditorDocumentServiceMenuContribution = {
    kind: "document-service",
    id: "docx.export",
    menuId: "export",
    menuLabel: "Export",
    label: "Word document",
    service: "docx",
    operation: "export"
  };
  return {
    actions: useClassicEditorDocumentServices(model),
    contribution,
    eventTypes,
    link,
    revokeObjectURL,
    root,
    schedule,
    runScheduled(): void {
      scheduled?.();
    }
  };
}

/**
 * Creates one file-picker import action with a rejected service boundary.
 *
 * @param importDocument - Mounted instance import implementation.
 * @param currentDocument - Canonical document that must survive rejection.
 * @returns Action controller, selection trigger, event log, and document probe.
 */
function createImportFixture(
  importDocument: () => Promise<void>,
  currentDocument: Readonly<Record<string, unknown>>
) {
  const root = new EventTarget();
  const eventTypes: string[] = [];
  for (const type of [
    classicEditorDocumentServiceStartEvent,
    classicEditorDocumentServiceSuccessEvent,
    classicEditorDocumentServiceErrorEvent
  ]) {
    root.addEventListener(type, (event) => eventTypes.push(event.type));
  }
  const listeners = new Map<string, EventListener>();
  const file = {
    name: "broken.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    arrayBuffer: vi.fn(async () => Uint8Array.from([1, 2, 3]).buffer)
  };
  const input = {
    type: "",
    hidden: false,
    accept: "",
    files: { item: vi.fn(() => file) },
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, listener);
    }),
    click: vi.fn(),
    remove: vi.fn()
  };
  const ownerDocument = {
    body: { append: vi.fn() },
    createElement: vi.fn(() => input)
  } as unknown as Document;
  const getJSON = vi.fn(() => currentDocument);
  const context = {
    ownerDocument,
    root,
    instance: {
      registry: {
        services: new Map([["docx", {
          import: true,
          format: {
            extensions: [".docx"],
            mimeTypes: [file.type]
          }
        }]])
      },
      importDocument,
      getJSON
    }
  } as unknown as ClassicEditorRenderContext;
  const model = shallowRef({ context } as unknown as ClassicEditorShellModel);
  const contribution: ClassicEditorDocumentServiceMenuContribution = {
    kind: "document-service",
    id: "docx.import",
    menuId: "import",
    menuLabel: "Import",
    label: "Word document",
    service: "docx",
    operation: "import"
  };
  return {
    actions: useClassicEditorDocumentServices(model),
    contribution,
    eventTypes,
    getJSON,
    root,
    /** Simulates choosing the invalid artifact in the native file picker. */
    selectFile(): void {
      listeners.get("change")?.(new Event("change"));
    }
  };
}
