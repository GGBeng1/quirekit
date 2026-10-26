// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import {
  mountQuireDevtoolsPanel,
  renderQuireDevtoolsPanelHtml
} from "./index";
import { renderPanelStyles } from "./style";
import type {
  QuireDevtools,
  QuireDevtoolsEntry,
  QuireDevtoolsSnapshot,
  QuireDevtoolsSubscriber
} from "../types";

describe("devtools panel", () => {
  it("lets the host reserve a non-overlapping launcher inset", () => {
    const styles = renderPanelStyles();

    expect(styles).toContain("var(--qk-devtools-launcher-inline-end,18px)");
    expect(styles).toContain("var(--qk-devtools-launcher-block-end,18px)");
    expect(styles).toContain("var(--qk-devtools-launcher-block-end,12px)");
  });

  it("renders a fixed launcher, dock shell, document tool, and native JSON tree", () => {
    const devtools = createFakeDevtools();
    const html = renderQuireDevtoolsPanelHtml(devtools, {
      exportTopCount: 42,
      open: true,
      panelOffset: { x: 18, y: -24 }
    });
    const fullscreenHtml = renderQuireDevtoolsPanelHtml(devtools, {
      fullscreen: true,
      open: true,
      panelOffset: { x: 18, y: -24 }
    });
    const searchHtml = renderQuireDevtoolsPanelHtml(devtools, {
      jsonExpandedPaths: ["$"],
      jsonSearch: "hello",
      open: true
    });
    const timelineHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "performance",
      open: true
    });
    const slowTimelineHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "performance",
      open: true,
      timelineSlowOnly: true
    });
    const expandedTimelineHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "performance",
      expandedTimelineEntryIds: [1],
      open: true
    });
    const expandedInteractionTimelineHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "performance",
      expandedTimelineEntryIds: [3],
      open: true
    });
    const interactionsHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "interactions",
      expandedInteractionIds: [3],
      open: true
    });
    const stateHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "state",
      open: true
    });
    const renderHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "render",
      open: true
    });

    expect(html).toContain("QuireKit Devtools");
    expect(html).toContain("qk-devtools-launcher");
    expect(html).toContain("role=\"complementary\"");
    expect(html).toContain("transform:translate3d(18px,-24px,0)");
    expect(html).toContain("data-fullscreen=\"false\"");
    expect(fullscreenHtml).toContain("data-fullscreen=\"true\"");
    expect(fullscreenHtml).not.toContain("transform:translate3d(18px,-24px,0)");
    expect(html).toContain("data-open=\"true\"");
    expect(html).not.toContain("qk-devtools-backdrop");
    expect(html).not.toContain("<json-viewer");
    expect(html).toContain("qk-devtools-rail");
    expect(html).toContain("qk-devtools-json-tree");
    expect(html).toContain("qk-devtools-logo");
    expect(html).toContain("data-qk-devtools-action=\"json-expand-all\"");
    expect(html).toContain("data-qk-devtools-action=\"json-collapse-all\"");
    expect(html).toContain("data-qk-devtools-action=\"json-copy\"");
    expect(html).toContain("data-qk-devtools-action=\"export\"");
    expect(html).toContain("data-qk-devtools-export-scope=\"slow\"");
    expect(html).toContain("data-qk-devtools-export-scope=\"recent\"");
    expect(html).toContain("data-qk-devtools-export-scope=\"interactions\"");
    expect(html).toContain("data-qk-devtools-export-top-count");
    expect(html).toContain("data-qk-devtools-action=\"fullscreen-toggle\"");
    expect(html).toContain("value=\"42\"");
    expect(html).toContain("<header class=\"qk-devtools-topbar\" data-qk-devtools-drag-handle>");
    expect(html).toContain("data-qk-devtools-drag-handle");
    expect(html).toContain("data-qk-devtools-json-search");
    expect(html).toContain("qk-devtools-json-tree__tag");
    expect(html).toContain(">paragraph</span>");
    expect(html).toContain("text");
    expect(html).toContain("&quot;hello&quot;");
    expect(searchHtml).toContain("1 matches");
    expect(searchHtml).toContain("data-match=\"true\"");
    expect(searchHtml).toContain("&quot;hello&quot;");
    expect(timelineHtml).toContain("Performance");
    expect(timelineHtml).toContain("qk-devtools__log-scroll");
    expect(timelineHtml).toContain("transaction");
    expect(timelineHtml).toContain("data-qk-devtools-action=\"timeline-toggle\"");
    expect(timelineHtml).toContain("aria-expanded=\"false\"");
    expect(timelineHtml).not.toContain("<tr class=\"qk-devtools-entry-detail\">");
    expect(timelineHtml).toContain("observed");
    expect(slowTimelineHtml).toContain("data-qk-devtools-timeline-slow-only");
    expect(slowTimelineHtml).toContain("checked");
    expect(slowTimelineHtml).toContain("transaction");
    expect(slowTimelineHtml).not.toContain("click to caret");
    expect(slowTimelineHtml).not.toContain("No slow entries captured.");
    expect(expandedTimelineHtml).toContain("aria-expanded=\"true\"");
    expect(expandedTimelineHtml).toContain("<tr class=\"qk-devtools-entry-detail\">");
    expect(expandedTimelineHtml).toContain("trigger");
    expect(expandedTimelineHtml).toContain("beforeinput / input=insertText / textarea");
    expect(expandedTimelineHtml).toContain("#0 replace 3-3 del=0 ins=1 text=&quot;!&quot; nodes=text");
    expect(expandedInteractionTimelineHtml).toContain("qk-devtools-interaction-detail");
    expect(expandedInteractionTimelineHtml).toContain("colspan=\"5\"");
    expect(expandedInteractionTimelineHtml).toContain("qk-devtools-log-group__entry");
    expect(expandedInteractionTimelineHtml).toContain("<span>#1</span>");
    expect(expandedInteractionTimelineHtml).toContain("<span>#2</span>");
    expect(expandedInteractionTimelineHtml).toContain("cache delta");
    expect(interactionsHtml).toContain("Interactions");
    expect(interactionsHtml).toContain("click to caret");
    expect(interactionsHtml).toContain("render #2");
    expect(interactionsHtml).toContain("data-qk-devtools-action=\"interaction-toggle\"");
    expect(interactionsHtml).toContain("qk-devtools-interaction-detail");
    expect(interactionsHtml).toContain("qk-devtools-log-group__entry");
    expect(interactionsHtml).toContain("<span>#1</span>");
    expect(interactionsHtml).toContain("<span>#2</span>");
    expect(interactionsHtml).toContain("primary / full");
    expect(interactionsHtml).toContain("cache delta");
    expect(stateHtml).toContain("doc, paragraph, text");
    expect(renderHtml).toContain("primary");
    expect(renderHtml).toContain("Cache Delta");
    expect(renderHtml).toContain("Display commands");
    expect(renderHtml).toContain("88% h7 m1 s1");
    expect(renderHtml).toContain("ex3 tx2 leaf1 prefix67% ph2 pm1 pr4");
    expect(renderHtml).toContain(
      "prefix67% ph2 pm1 prefixPages6 conv50% suffixPages4 recomputedPages3 s3"
    );
    expect(renderHtml).toContain("id3 idShift2 shift1 source0 node2");
  });

  it("refreshes only the launcher count while closed and catches the panel up on open", () => {
    const devtools = createFakeDevtools();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mount = mountQuireDevtoolsPanel(devtools, host);

    expect(host.innerHTML).toContain("qk-devtools-launcher");
    expect(host.innerHTML).not.toContain("hello");
    devtools.__setSnapshot({
      ...devtools.getSnapshot(),
      textLength: 4,
      document: { type: "doc", content: [{ type: "paragraph" }] }
    });
    devtools.__setEntries([
      ...devtools.getEntries(),
      {
        id: 4,
        kind: "operation",
        source: "input",
        stepCount: 1,
        docChanged: true,
        selectionSet: false,
        metaKeys: ["uiEvent"],
        startedAt: 20,
        endedAt: 22,
        durationMs: 2,
        measured: true,
        slow: true
      }
    ]);
    devtools.__emit();

    expect(host.innerHTML).not.toContain("Text 4");
    expect(host.querySelector(".qk-devtools-launcher__count")?.textContent)
      .toBe("2 slow");
    clickElement(host.querySelector("[data-qk-devtools-action=\"toggle\"]"));
    expect(host.innerHTML).toContain("Text 4");
    mount.destroy();

    expect(host.innerHTML).toBe("");
    expect(devtools.__unsubscribe).toHaveBeenCalledTimes(1);
    host.remove();
  });

  it("toggles timeline details from an operation row click", () => {
    const devtools = createFakeDevtools();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mount = mountQuireDevtoolsPanel(devtools, host);

    clickElement(host.querySelector("[data-qk-devtools-action=\"toggle\"]"));
    clickElement(host.querySelector("[data-qk-devtools-tab=\"performance\"]"));

    expect(host.innerHTML).toContain("data-qk-devtools-action=\"timeline-toggle\"");
    expect(host.innerHTML).not.toContain("<tr class=\"qk-devtools-entry-detail\">");

    clickElement(host.querySelector("[data-qk-devtools-entry-id=\"1\"]"));

    expect(host.innerHTML).toContain("<tr class=\"qk-devtools-entry-detail\">");

    mount.destroy();
    host.remove();
  });

  it("toggles timeline details from an interaction row click", () => {
    const devtools = createFakeDevtools();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mount = mountQuireDevtoolsPanel(devtools, host);

    clickElement(host.querySelector("[data-qk-devtools-action=\"toggle\"]"));
    clickElement(host.querySelector("[data-qk-devtools-tab=\"performance\"]"));

    expect(host.innerHTML).not.toContain("<tr class=\"qk-devtools-interaction-detail\"");

    clickElement(host.querySelector("[data-qk-devtools-entry-id=\"3\"]"));

    expect(host.innerHTML).toContain("<tr class=\"qk-devtools-interaction-detail\"");
    expect(host.innerHTML).toContain("cache delta");

    mount.destroy();
    host.remove();
  });

  it("filters the performance timeline to slow entries", () => {
    const devtools = createFakeDevtools();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const mount = mountQuireDevtoolsPanel(devtools, host);

    clickElement(host.querySelector("[data-qk-devtools-action=\"toggle\"]"));
    clickElement(host.querySelector("[data-qk-devtools-tab=\"performance\"]"));
    expect(host.innerHTML).toContain("click to caret");

    const filter = host.querySelector<HTMLInputElement>(
      "[data-qk-devtools-timeline-slow-only]"
    );
    if (filter) {
      filter.checked = true;
      filter.dispatchEvent(new Event("input", { bubbles: true }));
    }

    expect(host.innerHTML).toContain("transaction");
    expect(host.innerHTML).not.toContain("click to caret");

    mount.destroy();
    host.remove();
  });

  it("distinguishes an empty slow filter from an empty recorder", () => {
    const devtools = {
      ...createFakeDevtools(),
      getEntries: (): readonly QuireDevtoolsEntry[] => []
    };

    const emptyHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "performance",
      open: true
    });
    const emptySlowHtml = renderQuireDevtoolsPanelHtml(devtools, {
      activeTab: "performance",
      open: true,
      timelineSlowOnly: true
    });

    expect(emptyHtml).toContain("No entries captured yet.");
    expect(emptySlowHtml).toContain("No slow entries captured.");
  });
});

interface FakeDevtools extends QuireDevtools {
  /** Emits a fake devtools change event. */
  __emit(): void;
  /** Replaces the fake recorder entries. */
  __setEntries(entries: readonly QuireDevtoolsEntry[]): void;
  /** Replaces the fake snapshot. */
  __setSnapshot(snapshot: QuireDevtoolsSnapshot): void;
  /** Spy called when the fake subscription is removed. */
  readonly __unsubscribe: ReturnType<typeof vi.fn>;
}

/**
 * Creates a fake devtools instance for panel tests.
 *
 * @returns Fake devtools instance.
 */
function createFakeDevtools(): FakeDevtools {
  let subscriber: QuireDevtoolsSubscriber | undefined;
  let snapshot: QuireDevtoolsSnapshot = {
    attached: true,
    docSize: 9,
    textLength: 5,
    selection: { from: 1, to: 1, empty: true, anchor: 1, head: 1 },
    schema: {
      topNode: "doc",
      nodes: ["doc", "paragraph", "text"],
      marks: []
    },
    extensionNames: ["document", "paragraph", "text", "devtools"],
    pluginKeys: ["plugin$"],
    storageKeys: ["document", "paragraph", "text", "devtools"],
    document: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello" }]
        }
      ]
    },
    latestRender: {
      viewId: "primary",
      mode: "canvas",
      strategy: "full",
      commandCount: 3,
      blockCount: 1,
      caretCount: 1,
      selectionRangeCount: 0,
      overlayCount: 0,
      documentRect: { x: 0, y: 0, width: 100, height: 40 },
      viewportRect: { x: 0, y: 0, width: 100, height: 40 },
      displayWidth: 100,
      displayHeight: 40,
      devicePixelRatio: 1,
      cacheCounters: {
        layoutProduct: {
          rebuilt: 1,
          reused: 0,
          fallbackReason: null
        },
        retainedBlock: {
          commits: 1,
          reconciledRecords: 4,
          rebuiltRecords: 1,
          reusedRecords: 3,
          projectedRecords: 4,
          removedRecords: 0,
          heightIndexRebuilds: 1,
          heightIndexDeltaBatches: 0,
          heightIndexUpdatedEntries: 0,
          heightIndexQueries: 4,
          debugFlowComparisons: 0,
          providerExecution: {
            snapshotEpochs: 1,
            openedExecutions: 2,
            suppliedContinuations: 0,
            committedContinuations: 2,
            discardedContinuations: 0,
            canceledJobs: 0
          }
        },
        blockShape: {
          fragmentHits: 4,
          fragmentMisses: 1,
          fragmentStores: 1,
          inputHits: 3,
          inputMisses: 1,
          inputStores: 1,
          topLevelInputExactHits: 2,
          topLevelInputShiftHits: 1,
          topLevelInputMisses: 1,
          topLevelInputStores: 4,
          localShapeHits: 2,
          localShapeMisses: 1,
          localShapeStores: 1,
          localShapeSuffixHits: 1,
          localShapeConvergedSuffixHits: 1,
          localShapeConvergenceMisses: 2,
          localShapeReuseMisses: 3,
        },
        measuredSource: {
          hits: 6,
          exactHits: 3,
          shiftedTextHits: 2,
          shiftedLeafHits: 1,
          misses: 1,
          stores: 1,
          textPrefixHits: 2,
          textPrefixMisses: 1,
          textPrefixReusedItems: 4,
          bodyPrefixHits: 2,
          bodyPrefixMisses: 1,
          bodyPrefixReusedItems: 4,
          bodySuffixHits: 1,
          bodySuffixMisses: 1,
          bodySuffixReusedItems: 3
        },
        paginationCheckpoint: {
          prefixHits: 2,
          prefixMisses: 1,
          prefixPagesReused: 6,
          convergenceHits: 1,
          convergenceMisses: 1,
          suffixPagesReused: 4,
          pagesRecomputed: 3,
          stores: 3
        },
        displayCommand: {
          hits: 7,
          identityHits: 3,
          identityShiftHits: 2,
          shiftSignatureHits: 1,
          sourceShiftHits: 0,
          textNodeHits: 2,
          textNodeMisses: 1,
          textNodeStores: 1,
          misses: 1,
          stores: 1
        }
      },
      cacheCounterDelta: {
        layoutProduct: {
          rebuilt: 1,
          reused: 0,
          fallbackReason: null
        },
        retainedBlock: {
          commits: 1,
          reconciledRecords: 4,
          rebuiltRecords: 1,
          reusedRecords: 3,
          projectedRecords: 4,
          removedRecords: 0,
          heightIndexRebuilds: 1,
          heightIndexDeltaBatches: 0,
          heightIndexUpdatedEntries: 0,
          heightIndexQueries: 4,
          debugFlowComparisons: 0,
          providerExecution: {
            snapshotEpochs: 1,
            openedExecutions: 2,
            suppliedContinuations: 0,
            committedContinuations: 2,
            discardedContinuations: 0,
            canceledJobs: 0
          }
        },
        blockShape: {
          fragmentHits: 4,
          fragmentMisses: 1,
          fragmentStores: 1,
          inputHits: 3,
          inputMisses: 1,
          inputStores: 1,
          topLevelInputExactHits: 2,
          topLevelInputShiftHits: 1,
          topLevelInputMisses: 1,
          topLevelInputStores: 4,
          localShapeHits: 2,
          localShapeMisses: 1,
          localShapeStores: 1,
          localShapeSuffixHits: 1,
          localShapeConvergedSuffixHits: 1,
          localShapeConvergenceMisses: 2,
          localShapeReuseMisses: 3,
        },
        measuredSource: {
          hits: 6,
          exactHits: 3,
          shiftedTextHits: 2,
          shiftedLeafHits: 1,
          misses: 1,
          stores: 1,
          textPrefixHits: 2,
          textPrefixMisses: 1,
          textPrefixReusedItems: 4,
          bodyPrefixHits: 2,
          bodyPrefixMisses: 1,
          bodyPrefixReusedItems: 4,
          bodySuffixHits: 1,
          bodySuffixMisses: 1,
          bodySuffixReusedItems: 3
        },
        paginationCheckpoint: {
          prefixHits: 2,
          prefixMisses: 1,
          prefixPagesReused: 6,
          convergenceHits: 1,
          convergenceMisses: 1,
          suffixPagesReused: 4,
          pagesRecomputed: 3,
          stores: 3
        },
        displayCommand: {
          hits: 7,
          identityHits: 3,
          identityShiftHits: 2,
          shiftSignatureHits: 1,
          sourceShiftHits: 0,
          textNodeHits: 2,
          textNodeMisses: 1,
          textNodeStores: 1,
          misses: 1,
          stores: 1
        }
      }
    }
  };
  let entries: readonly QuireDevtoolsEntry[] = [
    {
      id: 1,
      kind: "operation",
      source: "transaction",
      stepCount: 1,
      docChanged: true,
      selectionSet: false,
      metaKeys: ["uiEvent"],
      startedAt: 0,
      endedAt: 4,
      durationMs: 4,
      measured: true,
      slow: true,
      trigger: {
        source: "beforeinput",
        inputType: "insertText",
        target: "textarea"
      },
      details: {
        docBeforeSize: 8,
        docAfterSize: 9,
        selectionType: "TextSelection",
        selectionFrom: 4,
        selectionTo: 4,
        changedRange: { from: 3, to: 4 },
        meta: [
          {
            key: "uiEvent",
            valueType: "string",
            preview: "\"input\""
          }
        ],
        steps: [
          {
            index: 0,
            type: "replace",
            from: 3,
            to: 3,
            deletedSize: 0,
            insertedSize: 1,
            textPreview: "!",
            nodeTypes: ["text"]
          }
        ]
      }
    },
    {
      id: 2,
      kind: "render",
      render: snapshot.latestRender!,
      startedAt: 5,
      endedAt: 5,
      durationMs: 0,
      measured: false,
      slow: false
    },
    {
      id: 3,
      kind: "interaction",
      source: "pointerdown",
      label: "click to caret",
      target: "textarea",
      settled: true,
      operationCount: 1,
      renderCount: 1,
      operationEntryIds: [1],
      renderEntryIds: [2],
      renderEntryId: 2,
      startedAt: 3,
      endedAt: 18,
      durationMs: 15,
      measured: true,
      slow: false
    }
  ];
  const unsubscribe = vi.fn();

  return {
    __emit: () => subscriber?.(),
    __setEntries: (nextEntries: readonly QuireDevtoolsEntry[]) => {
      entries = nextEntries;
    },
    __setSnapshot: (nextSnapshot: QuireDevtoolsSnapshot) => {
      snapshot = nextSnapshot;
    },
    __unsubscribe: unsubscribe,
    extension: vi.fn(),
    observeInteractions: vi.fn(),
    onCanvasRender: vi.fn(),
    getEntries: () => entries,
    getSnapshot: () => snapshot,
    subscribe: (nextSubscriber: QuireDevtoolsSubscriber) => {
      subscriber = nextSubscriber;
      return { unsubscribe };
    },
    mountPanel: vi.fn(),
    attachEditor: vi.fn(),
    destroy: vi.fn()
  } as unknown as FakeDevtools;
}

/**
 * Clicks an element in DOM-backed panel tests.
 *
 * @param element - Element to click.
 */
function clickElement(element: Element | null): void {
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}
