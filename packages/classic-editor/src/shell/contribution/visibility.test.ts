import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorBehavior,
  ClassicEditorContribution,
  ClassicEditorRenderContext
} from "../../types";
import { filterVisibleClassicEditorContributions } from "./visibility";

describe("Classic Editor mounted contribution visibility", () => {
  it("distinguishes missing capability from a temporarily disabled command", () => {
    const installedBehavior: ClassicEditorBehavior = { execute: () => true };
    const missingBehavior: ClassicEditorBehavior = { execute: () => true };
    const availability = vi.fn(
      (behavior: ClassicEditorBehavior) => behavior !== missingBehavior
    );
    const contributions: readonly ClassicEditorContribution[] = [
      {
        kind: "toolbar-control",
        id: "installed",
        label: "Installed",
        behavior: installedBehavior
      },
      {
        kind: "toolbar-control",
        id: "missing",
        label: "Missing",
        behavior: missingBehavior
      },
      {
        kind: "status-item",
        id: "conditional",
        when: () => false,
        render: () => null
      }
    ];
    const context = {
      instance: { isContributionAvailable: availability }
    } as unknown as ClassicEditorRenderContext;

    expect(filterVisibleClassicEditorContributions(contributions, context)
      .map((contribution) => contribution.id)).toEqual(["installed"]);
    expect(availability).toHaveBeenCalledTimes(2);
  });

  it("shows only document operations implemented by the referenced service", () => {
    const contributions: readonly ClassicEditorContribution[] = [
      {
        kind: "document-service",
        id: "json.import",
        menuId: "import",
        menuLabel: "Import",
        label: "JSON",
        service: "json",
        operation: "import"
      },
      {
        kind: "document-service",
        id: "json.export",
        menuId: "export",
        menuLabel: "Export",
        label: "JSON",
        service: "json",
        operation: "export"
      }
    ];
    const context = {
      instance: {
        registry: {
          services: new Map([[
            "json",
            {
              id: "json",
              label: "JSON",
              format: { id: "json", extensions: [".json"], mimeTypes: [] },
              import: () => undefined
            }
          ]])
        }
      }
    } as unknown as ClassicEditorRenderContext;

    expect(filterVisibleClassicEditorContributions(contributions, context)
      .map((contribution) => contribution.id)).toEqual(["json.import"]);
  });
});
