// @vitest-environment happy-dom

import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { classicEditorDocumentServiceReportEvent } from "@classic/service";
import type { MountedTaskFeedbackFixture } from "./mount-fixture";
import { mountTaskFeedbackFixture } from "./mount-fixture";

const fixtures: MountedTaskFeedbackFixture[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  document.body.replaceChildren();
});

describe("Classic task feedback mount", () => {
  it("keeps normal creation and insertion lifecycle silent", async () => {
    const fixture = await mountFixture();
    const handle = fixture.instance.tasks.startCreation({
      taskId: "image-create",
      creationKind: "image",
      phase: "ready"
    });
    fixture.instance.tasks.update(handle, {
      phase: "uploading",
      progress: { completed: 5, total: 10, unit: "items" },
      canCancel: true
    });
    await nextTick();

    expect(fixture.host.querySelector(".qk-toast")).toBeNull();
    expect(fixture.instance.tasks.update(handle, { phase: "inserted" })).toBe(true);
    await nextTick();
    expect(fixture.host.querySelector(".qk-toast")).toBeNull();
    expect(fixture.instance.tasks.snapshot.tasks).toHaveLength(0);
  });

  it("projects retryable errors through the public Toast in English", async () => {
    const fixture = await mountFixture({ locale: "en", backend: "svg" });
    const retry = vi.fn();
    const handle = fixture.instance.tasks.startTask({
      taskId: "import-error",
      kind: "import",
      phase: "processing",
      label: "Quarterly import"
    }, { retry });
    fixture.instance.tasks.update(handle, {
      phase: "error",
      diagnostics: [{ code: "IMPORT_FAILED", retryable: true }]
    });

    await vi.waitFor(() => {
      const toast = fixture.host.querySelector<HTMLElement>(".qk-toast");
      expect(toast?.textContent).toContain("Quarterly import");
      expect(toast?.textContent).toContain("IMPORT_FAILED");
    });
    const toast = fixture.host.querySelector<HTMLElement>(".qk-toast");
    clickButton(toast, "Retry");
    expect(retry).toHaveBeenCalledOnce();
    expect(fixture.instance.tasks.snapshot.tasks[0]?.attempt).toBe(1);
  });

  it("isolates public error Toasts across two editor roots", async () => {
    const first = await mountFixture();
    const second = await mountFixture({ locale: "en", backend: "svg" });
    const firstHandle = first.instance.tasks.startTask({
      taskId: "same",
      kind: "export",
      phase: "processing"
    });
    const secondHandle = second.instance.tasks.startTask({
      taskId: "same",
      kind: "import",
      phase: "processing"
    });
    first.instance.tasks.update(firstHandle, {
      phase: "error",
      diagnostics: [{ code: "EXPORT_FAILED", retryable: false }]
    });
    second.instance.tasks.update(secondHandle, {
      phase: "error",
      diagnostics: [{ code: "IMPORT_FAILED", retryable: false }]
    });

    await vi.waitFor(() => {
      expect(first.host.querySelector(".qk-toast")?.textContent).toContain("导出");
      expect(second.host.querySelector(".qk-toast")?.textContent).toContain("Import");
    });
    expect(first.host.textContent).not.toContain("IMPORT_FAILED");
    expect(second.host.textContent).not.toContain("EXPORT_FAILED");
  });

  it("keeps ordinary success details collapsed and neutrally named", async () => {
    const fixture = await mountFixture();
    const root = fixture.host.parentElement;
    root?.dispatchEvent(new CustomEvent(classicEditorDocumentServiceReportEvent, {
      detail: {
        operation: "import",
        serviceId: "docx",
        fileName: "document.docx",
        warnings: [],
        diagnostics: [{
          code: "last-rendered-page-break-preserved",
          message: "Source fallback.",
          severity: "info",
          disposition: "preserved"
        }]
      }
    }));
    await nextTick();

    const details = fixture.host.querySelector<HTMLDetailsElement>("details");
    expect(details?.open).toBe(false);
    expect(details?.querySelector("summary")?.textContent?.trim())
      .toBe("查看详情");
    expect(fixture.host.querySelector("strong")?.textContent).toBe("导入完成");
  });
});

/**
 * Mounts and tracks one task feedback fixture.
 *
 * @param options - Optional locale and backend facts.
 * @returns Mounted fixture.
 */
async function mountFixture(
  options: Parameters<typeof mountTaskFeedbackFixture>[0] = {}
): Promise<MountedTaskFeedbackFixture> {
  const fixture = await mountTaskFeedbackFixture(options);
  fixtures.push(fixture);
  return fixture;
}

/**
 * Activates one button by accessible text inside a surface.
 *
 * @param surface - Surface containing the action.
 * @param label - Exact visible button text.
 */
function clickButton(surface: HTMLElement | null | undefined, label: string): void {
  const button = [...(surface?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
    .find((candidate) => candidate.textContent?.trim() === label);
  expect(button, `button ${label}`).toBeDefined();
  button?.click();
}
