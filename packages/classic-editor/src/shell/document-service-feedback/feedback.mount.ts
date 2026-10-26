import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classicEditorDocumentServiceReportEvent,
  classicEditorDocumentServiceSuccessEvent,
  type ClassicEditorDocumentServiceReportDetail
} from "@classic/service";
import { mountTaskFeedbackFixture } from "../components/task-feedback/mount-fixture";

const fixtures: Awaited<ReturnType<typeof mountTaskFeedbackFixture>>[] = [];
const contribution = {
  kind: "document-service", id: "docx.export", menuId: "export", menuLabel: "导出",
  label: "Word 文档", service: "docx", operation: "export"
} as const;
const report: ClassicEditorDocumentServiceReportDetail = {
  operation: "export", serviceId: "docx", fileName: "document.docx", warnings: [],
  diagnostics: [{
    code: "consumer-callout-projected-as-table", severity: "info", disposition: "approximated",
    message: "Recoverable table projection."
  }]
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.destroy();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** @returns A real Vue feedback surface and its public event root. */
async function mount() {
  const fixture = await mountTaskFeedbackFixture();
  fixtures.push(fixture);
  return { ...fixture, root: fixture.host.parentElement! };
}

describe("document report severity and lifetime", () => {
  it("automatically dismisses pure information after report and success", async () => {
    const { root, host } = await mount();
    root.dispatchEvent(new CustomEvent(classicEditorDocumentServiceReportEvent, { detail: report }));
    root.dispatchEvent(new CustomEvent(classicEditorDocumentServiceSuccessEvent, {
      detail: { contribution, fileName: report.fileName }
    }));
    await nextTick();
    const panel = host.querySelector("aside")!;
    expect(panel.getAttribute("data-tone")).toBe("success");
    expect(panel.getAttribute("role")).toBe("status");
    expect(panel.querySelector("strong")?.textContent).toBe("导出完成");
    expect(panel.querySelector("code")?.textContent).toBe(report.diagnostics[0]!.code);
    await vi.advanceTimersByTimeAsync(3_200);
    expect(host.querySelector("aside")).toBeNull();
  });

  it("keeps opened details available even when a later success event arrives", async () => {
    const { root, host } = await mount();
    root.dispatchEvent(new CustomEvent(classicEditorDocumentServiceReportEvent, { detail: report }));
    await nextTick();
    const details = host.querySelector("details")!;
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    root.dispatchEvent(new CustomEvent(classicEditorDocumentServiceSuccessEvent, {
      detail: { contribution, fileName: report.fileName }
    }));
    await vi.advanceTimersByTimeAsync(4_000);
    expect(host.querySelector("aside")?.getAttribute("data-tone")).toBe("success");
    expect(host.querySelector("details")?.open).toBe(true);
    host.querySelector<HTMLButtonElement>('[aria-label="关闭"]')!.click();
    await nextTick();
    expect(host.querySelector("aside")).toBeNull();
  });

  it("does not let an earlier success timer dismiss a warning or error", async () => {
    const { root, host } = await mount();
    for (const severity of ["warning", "error"] as const) {
      root.dispatchEvent(new CustomEvent(classicEditorDocumentServiceReportEvent, { detail: report }));
      await vi.advanceTimersByTimeAsync(1_000);
      root.dispatchEvent(new CustomEvent(classicEditorDocumentServiceReportEvent, {
        detail: { ...report, diagnostics: [{ code: "source-unavailable", severity, message: "Source unavailable." }] }
      }));
      await vi.advanceTimersByTimeAsync(4_000);
      const panel = host.querySelector("aside")!;
      expect(panel.getAttribute("data-tone")).toBe(severity);
      expect(panel.getAttribute("role")).toBe("alert");
      expect(panel.querySelector("code")?.textContent).toBe("source-unavailable");
    }
  });

  it("clears the success timer when the component unmounts", async () => {
    const { root } = await mount();
    const schedule = vi.spyOn(globalThis, "setTimeout");
    const cancel = vi.spyOn(globalThis, "clearTimeout");
    root.dispatchEvent(new CustomEvent(classicEditorDocumentServiceReportEvent, { detail: report }));
    const index = schedule.mock.calls.findIndex(([, delay]) => delay === 3_200);
    expect(index).toBeGreaterThanOrEqual(0);
    const timer = schedule.mock.results[index]!.value;
    fixtures.pop()!.destroy();
    expect(cancel).toHaveBeenCalledWith(timer);
  });
});
