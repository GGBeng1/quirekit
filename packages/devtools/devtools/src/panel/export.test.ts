import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createDevtoolsExportPayload,
  createDevtoolsExportText,
  exportPanelData,
  normalizeExportTopCount
} from "./export";
import type { QuireDevtoolsExportPayload } from "./export";
import type {
  QuireDevtools,
  QuireDevtoolsEntry,
  QuireDevtoolsInteractionEntry,
  QuireDevtoolsRenderSummary
} from "../types";

describe("devtools panel export", () => {
  it("exports slow entries, recent entries, and interaction data", () => {
    const devtools = createFakeDevtools();
    const slow = createDevtoolsExportPayload(devtools, {
      exportedAt: "2026-06-28T00:00:00.000Z",
      scope: "slow"
    });
    const recent = createDevtoolsExportPayload(devtools, {
      exportedAt: "2026-06-28T00:00:00.000Z",
      scope: "recent",
      topCount: 2
    });
    const interactions = createDevtoolsExportPayload(devtools, {
      exportedAt: "2026-06-28T00:00:00.000Z",
      scope: "interactions"
    });

    expect(slow.entries.map((entry) => entry.id)).toEqual([4, 2]);
    expect(recent.topCount).toBe(2);
    expect(recent.entries.map((entry) => entry.id)).toEqual([4, 3]);
    expect(interactions.entries.map((entry) => entry.id)).toEqual([3]);
    expect(interactions.relatedEntries?.map((entry) => entry.id)).toEqual([2, 1]);
    const interactionJson = JSON.parse(createDevtoolsExportText(interactions));

    expect(interactionJson).toMatchObject({
      entryCount: 1,
      exportedAt: "2026-06-28T00:00:00.000Z",
      scope: "interactions",
      version: 1
    });
    expect(interactionJson).not.toHaveProperty("snapshot");
  });

  it("normalizes the recent export count", () => {
    expect(normalizeExportTopCount(Number.NaN)).toBe(25);
    expect(normalizeExportTopCount(0)).toBe(1);
    expect(normalizeExportTopCount(501)).toBe(500);
    expect(normalizeExportTopCount(2.8)).toBe(2);
  });

  it("includes non-slow logs referenced by slow interactions", () => {
    const source = createFakeDevtools();
    const devtools = {
      getEntries: () => source.getEntries().map((entry) => {
        return entry.kind === "interaction"
          ? { ...entry, slow: true }
          : entry;
      })
    };
    const slow = createDevtoolsExportPayload(devtools, {
      exportedAt: "2026-06-28T00:00:00.000Z",
      scope: "slow"
    });

    expect(slow.entries.map((entry) => entry.id)).toEqual([4, 3, 2]);
    expect(slow.relatedEntries?.map((entry) => entry.id)).toEqual([1]);
  });

  it("copies exported panel data even when no download target is available", async () => {
    const copied: string[] = [];

    await exportPanelData({
      copyText: async (text) => {
        copied.push(text);
      },
      devtools: createFakeDevtools(),
      ownerDocument: undefined,
      scope: "slow",
      topCount: 25
    });

    expect(copied).toHaveLength(1);
    expect(JSON.parse(copied[0]!)).toMatchObject({
      entryCount: 2,
      scope: "slow",
      version: 1
    });
  });

  it("retains the table-era slow export as raw regression evidence", () => {
    const payload = readTableEraSlowFixture();
    const interactions = payload.entries.filter(
      (entry): entry is QuireDevtoolsInteractionEntry => entry.kind === "interaction"
    );
    const insertions = interactions.filter((entry) => entry.inputType === "insertText");
    const renderUseCounts = new Map<number, number>();

    for (const interaction of insertions) {
      for (const renderEntryId of interaction.renderEntryIds ?? []) {
        renderUseCounts.set(
          renderEntryId,
          (renderUseCounts.get(renderEntryId) ?? 0) + 1
        );
      }
    }

    expect(payload).toMatchObject({
      version: 1,
      scope: "slow",
      entryCount: 20
    });
    expect(payload.entries).toHaveLength(payload.entryCount);
    expect(payload.entries.every((entry) => entry.slow)).toBe(true);
    expect(insertions).toHaveLength(19);
    expect(
      insertions.every(
        (entry) => entry.target === "textarea.qk-canvas-editor__input-proxy"
      )
    ).toBe(true);
    expect(Math.max(...insertions.map((entry) => entry.operationCount))).toBe(7);
    expect(Math.max(...renderUseCounts.values())).toBeGreaterThan(1);
  });
});

/**
 * Reads the unmodified Devtools export supplied with the table-era lag report.
 *
 * @returns Historical slow export in the canonical Devtools payload shape.
 */
function readTableEraSlowFixture(): QuireDevtoolsExportPayload {
  const text = readFileSync(
    new URL("./export/fixtures/table-era-input-slow.json", import.meta.url),
    "utf8"
  );

  return JSON.parse(text) as QuireDevtoolsExportPayload;
}

/**
 * Creates a fake devtools reader for export tests.
 *
 * @returns Devtools reader.
 */
function createFakeDevtools(): Pick<QuireDevtools, "getEntries"> {
  const latestRender: QuireDevtoolsRenderSummary = {
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
    displayHeight: 40
  };
  const entries: readonly QuireDevtoolsEntry[] = [
    {
      id: 1,
      kind: "operation",
      source: "transaction",
      stepCount: 1,
      docChanged: true,
      selectionSet: false,
      metaKeys: [],
      startedAt: 0,
      endedAt: 4,
      durationMs: 4,
      measured: true,
      slow: false
    },
    {
      id: 2,
      kind: "render",
      render: latestRender,
      startedAt: 5,
      endedAt: 5,
      durationMs: 0,
      measured: false,
      slow: true
    },
    {
      id: 3,
      kind: "interaction",
      source: "beforeinput",
      label: "insertText",
      settled: true,
      operationCount: 1,
      renderCount: 1,
      operationEntryIds: [1],
      renderEntryIds: [2],
      renderEntryId: 2,
      startedAt: 1,
      endedAt: 18,
      durationMs: 17,
      measured: true,
      slow: false
    },
    {
      id: 4,
      kind: "operation",
      source: "transaction",
      stepCount: 2,
      docChanged: true,
      selectionSet: true,
      metaKeys: [],
      startedAt: 20,
      endedAt: 68,
      durationMs: 48,
      measured: true,
      slow: true
    }
  ];

  return {
    getEntries: () => entries
  };
}
