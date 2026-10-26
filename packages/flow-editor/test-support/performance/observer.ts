import type { Page } from "@playwright/test";
import type { FlowWorkSample } from "./types";
import type {} from "../types";

/** @param page - Isolated page with a settled graph, overview and search. @returns Completion of instrumentation without exposing graph internals. */
export async function observeWork(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.flowWorkProbe?.restore();
    const editor = window.flowFixture.editor(), read = editor.getDocument, search = editor.searchNodes, stringify = JSON.stringify;
    let sourceReads = 0, serializations = 0, searches = 0, paths: Record<string, number> = {};
    const overview = new Set<string>();
    editor.getDocument = () => { sourceReads++; return read(); };
    editor.searchNodes = (...args) => { searches++; return search(...args); };
    JSON.stringify = (value, replacer, space) => {
      if (value?.format === "quirekit-flowchart") serializations++;
      return stringify(value, replacer as never, space);
    };
    /** @param records - Actual browser paint-attribute changes. Counts only main paths and overview geometry. */
    function collect(records: MutationRecord[]): void {
      for (const record of records) {
        const element = record.target as Element, id = element.getAttribute("data-overview-node");
        if (id) overview.add(id);
        if (record.attributeName === "d" && element.matches("path[marker-end]")) {
          const edge = element.closest(".x6-edge")?.getAttribute("data-cell-id");
          if (edge) paths[edge] = (paths[edge] ?? 0) + 1;
        }
      }
    }
    const observer = new MutationObserver(collect);
    observer.observe(document.querySelector(".qk-flow-editor")!, { subtree: true, attributes: true, attributeFilter: ["d", "x", "y", "width", "height"] });
    window.flowWorkProbe = {
      /** @param reset - Starts a fresh observation interval. @returns Actual work, including queued native paint changes. */
      sample(reset = false) {
        collect(observer.takeRecords());
        const result = { sourceReads, serializations, searches, paths: { ...paths }, overview: [...overview] };
        if (reset) { sourceReads = serializations = searches = 0; paths = {}; overview.clear(); }
        return result;
      },
      /** Restores only this test's decorated methods and observer. */
      restore() { observer.disconnect(); editor.getDocument = read; editor.searchNodes = search; JSON.stringify = stringify; delete window.flowWorkProbe; },
    };
  });
}
/** @param page - Instrumented isolated page. @param reset - Starts a new observation interval after sampling. @returns Counts including queued browser mutations. */
export async function observedWork(page: Page, reset = false): Promise<FlowWorkSample> {
  return page.evaluate(reset => window.flowWorkProbe!.sample(reset), reset);
}
