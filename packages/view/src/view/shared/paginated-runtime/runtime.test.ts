import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuireImePreedit } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import type {
  MountedViewInteractionLifecycle,
  MountedViewScheduledUpdateLifecycle
} from "../lifecycle";
import type {
  MountedPaginatedGeometryFacade,
  MountedPaginatedTransientPresentation
} from "../paginated-facade";
import type { MountedPaginatedRenderFlow } from "../paginated-render-flow";
import { createMountedPaginatedRuntime } from "./runtime";
import type {
  CreateMountedPaginatedRuntimeOptions,
  MountedPaginatedRuntimeRequest,
  MountedPaginatedViewRenderReason
} from "./types";

/** Request accepted by the test runtime. */
type TestRequest = MountedPaginatedRuntimeRequest;

const doubles = vi.hoisted(() => ({
  createUpdates: vi.fn(),
  createInteraction: vi.fn(),
  createGeometry: vi.fn(),
  createPresentation: vi.fn(),
  createRenderFlow: vi.fn()
}));

vi.mock("../lifecycle", () => ({
  createMountedViewInteractionLifecycle: doubles.createInteraction,
  createMountedViewScheduledUpdateLifecycle: doubles.createUpdates
}));

vi.mock("../paginated-facade", () => ({
  createMountedPaginatedGeometryFacade: doubles.createGeometry,
  createMountedPaginatedTransientPresentation: doubles.createPresentation
}));

vi.mock("../paginated-render-flow", () => ({
  createMountedPaginatedRenderFlow: doubles.createRenderFlow
}));

describe("mounted paginated runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes scheduled, input, and focus work through one shared authority", () => {
    const harness = createRuntimeHarness();
    const onFocusChange = vi.fn();
    const runtime = createRuntime(harness, { onFocusChange });
    const scheduling = firstFactoryOptions(doubles.createUpdates);
    const interaction = firstFactoryOptions(doubles.createInteraction);
    const preedit = { range: { from: 4, to: 4 }, text: "ni" };

    scheduling.execute({ reason: "selection" });
    interaction.render("composition", preedit);
    interaction.onFocusChange(true);

    expect(harness.renderFlow.renderUpdate).toHaveBeenCalledWith({
      reason: "selection"
    });
    expect(harness.updates.request).toHaveBeenCalledWith({
      reason: "composition",
      imePreedit: preedit
    });
    expect(harness.presentation.setFocused).toHaveBeenCalledWith(true);
    expect(onFocusChange).toHaveBeenCalledWith(true);
    expect(
      harness.presentation.setFocused.mock.invocationCallOrder[0]
    ).toBeLessThan(onFocusChange.mock.invocationCallOrder[0] ?? 0);
    expect(runtime.renderResult).toBeUndefined();
  });

  it("keeps full and transient commits in one result and widget authority", () => {
    const harness = createRuntimeHarness();
    const syncInputProxy = vi.fn();
    const runtime = createRuntime(harness, { syncInputProxy });
    const geometry = firstFactoryOptions(doubles.createGeometry);
    const presentation = firstFactoryOptions(doubles.createPresentation);
    const fullResult = createRenderResult("full");
    const transientResult = createRenderResult("transient");

    runtime.commitRenderResult(fullResult);

    expect(runtime.renderResult).toBe(fullResult);
    expect(geometry.readRenderResult()).toBe(fullResult);
    expect(presentation.readRenderResult()).toBe(fullResult);
    expect(harness.widgetEvents.setTargets).toHaveBeenCalledWith(
      fullResult.viewTargets
    );
    expect(harness.interaction.refreshHeaderFooterEditingChrome)
      .toHaveBeenCalledOnce();
    expect(harness.interaction.refreshDrawingContextualCommands)
      .toHaveBeenCalledOnce();
    expect(harness.interaction.refreshCreatedDrawingTextEntry)
      .toHaveBeenCalledOnce();

    presentation.commitRenderResult(transientResult);
    presentation.setWidgetTargets(transientResult);
    presentation.syncInputProxy(transientResult);

    expect(runtime.renderResult).toBe(transientResult);
    expect(geometry.readRenderResult()).toBe(transientResult);
    expect(harness.widgetEvents.setTargets).toHaveBeenLastCalledWith(
      transientResult.viewTargets
    );
    expect(syncInputProxy).toHaveBeenCalledWith(
      transientResult,
      harness.renderFlow.imePreedit
    );
    expect(harness.interaction.refreshHeaderFooterEditingChrome)
      .toHaveBeenCalledTimes(2);
    expect(harness.interaction.refreshDrawingContextualCommands)
      .toHaveBeenCalledTimes(2);
    expect(harness.interaction.refreshCreatedDrawingTextEntry)
      .toHaveBeenCalledTimes(2);
  });

  it("projects selection reuse and refresh readiness from canonical resources", () => {
    const harness = createRuntimeHarness();
    const allowsSelectionReuse = vi.fn(() => true);
    const isDocumentPresentationReady = vi.fn(() => true);
    const runtime = createRuntime(harness, {
      allowsSelectionReuse,
      isDocumentPresentationReady
    });
    const renderFlow = firstFactoryOptions(doubles.createRenderFlow);
    const updatePatch = { reason: "selection" };

    expect(renderFlow.canReuseSelectionUpdate("selection")).toBe(true);
    expect(allowsSelectionReuse).toHaveBeenCalledOnce();
    expect(harness.presentation.canReuseSelectionUpdate)
      .toHaveBeenCalledWith("selection", undefined);
    expect(renderFlow.canRefreshDocument()).toBe(false);

    runtime.commitRenderResult(createRenderResult("refreshable"));

    expect(renderFlow.canRefreshDocument()).toBe(true);
    expect(isDocumentPresentationReady).toHaveBeenCalledOnce();
    renderFlow.renderSelectionUpdate("selection", updatePatch);
    expect(harness.presentation.renderSelectionUpdate).toHaveBeenCalledWith(
      "selection",
      updatePatch
    );
  });

  it("destroys owned lifecycles once in dependency-safe order", () => {
    const harness = createRuntimeHarness();
    const runtime = createRuntime(harness);

    runtime.destroy();
    runtime.destroy();

    expect(harness.updates.destroy).toHaveBeenCalledOnce();
    expect(harness.presentation.destroy).toHaveBeenCalledOnce();
    expect(harness.interaction.destroy).toHaveBeenCalledOnce();
    expect(harness.updates.destroy.mock.invocationCallOrder[0])
      .toBeLessThan(harness.presentation.destroy.mock.invocationCallOrder[0] ?? 0);
    expect(harness.presentation.destroy.mock.invocationCallOrder[0])
      .toBeLessThan(harness.interaction.destroy.mock.invocationCallOrder[0] ?? 0);
  });
});

/** Runtime doubles returned by the five canonical resource factories. */
interface RuntimeHarness {
  /** Scheduled-update authority. */
  readonly updates: MountedViewScheduledUpdateLifecycle<TestRequest> & {
    /** Spy used by routing assertions. */
    readonly request: ReturnType<typeof vi.fn>;
    /** Spy used by teardown assertions. */
    readonly destroy: ReturnType<typeof vi.fn>;
  };
  /** Interaction authority. */
  readonly interaction: MountedViewInteractionLifecycle & {
    /** Spy used by teardown assertions. */
    readonly destroy: ReturnType<typeof vi.fn>;
  };
  /** Widget target authority retained by interaction. */
  readonly widgetEvents: {
    /** Commits targets for the latest result. */
    readonly setTargets: ReturnType<typeof vi.fn>;
  };
  /** Geometry facade. */
  readonly geometry: MountedPaginatedGeometryFacade;
  /** Transient presentation authority. */
  readonly presentation: MountedPaginatedTransientPresentation & {
    /** Spy used by focus assertions. */
    readonly setFocused: ReturnType<typeof vi.fn>;
    /** Spy used by reuse assertions. */
    readonly canReuseSelectionUpdate: ReturnType<typeof vi.fn>;
    /** Spy used by selection-render assertions. */
    readonly renderSelectionUpdate: ReturnType<typeof vi.fn>;
    /** Spy used by teardown assertions. */
    readonly destroy: ReturnType<typeof vi.fn>;
  };
  /** Paginated render-flow authority. */
  readonly renderFlow: MountedPaginatedRenderFlow<MountedPaginatedViewRenderReason> & {
    /** Spy used by scheduled routing assertions. */
    readonly renderUpdate: ReturnType<typeof vi.fn>;
  };
}

/**
 * Creates resource doubles and connects them to the hoisted factory mocks.
 *
 * @returns Stable resource harness for one composition-root test.
 */
function createRuntimeHarness(): RuntimeHarness {
  const widgetEvents = { setTargets: vi.fn() };
  const updates = {
    request: vi.fn(),
    resolveMode: vi.fn(() => "sync" as const),
    currentRevision: vi.fn(() => ({ stateVersion: 0, layoutEpoch: 0 })),
    flush: vi.fn(() => false),
    getCounters: vi.fn(() => ({})),
    destroy: vi.fn()
  } as unknown as RuntimeHarness["updates"];
  const interaction = {
    widgetEvents,
    getInputBinding: vi.fn(),
    refreshHeaderFooterEditingChrome: vi.fn(),
    refreshDrawingContextualCommands: vi.fn(),
    refreshCreatedDrawingTextEntry: vi.fn(),
    focusInput: vi.fn(),
    addCleanup: vi.fn(),
    getInteractionTarget: vi.fn(() => null),
    setInteractionTarget: vi.fn(),
    getSelectionGeometryContext: vi.fn(),
    setSelectionGeometryContext: vi.fn(),
    getSelectionContext: vi.fn(),
    destroy: vi.fn()
  } as unknown as RuntimeHarness["interaction"];
  const geometry = {} as MountedPaginatedGeometryFacade;
  const presentation = {
    canReuseSelectionUpdate: vi.fn(() => true),
    renderSelectionUpdate: vi.fn(),
    syncAfterRender: vi.fn(),
    setFocused: vi.fn(),
    setCaretMode: vi.fn(),
    caretMode: "editing",
    overlayCaretVisible: vi.fn(() => true),
    destroy: vi.fn()
  } as unknown as RuntimeHarness["presentation"];
  const renderFlow = {
    imePreedit: { range: { from: 2, to: 2 }, text: "hao" },
    renderUpdate: vi.fn(),
    refreshDocument: vi.fn(),
    applyFillAdvance: vi.fn()
  } as unknown as RuntimeHarness["renderFlow"];

  doubles.createUpdates.mockReturnValue(updates);
  doubles.createInteraction.mockReturnValue(interaction);
  doubles.createGeometry.mockReturnValue(geometry);
  doubles.createPresentation.mockReturnValue(presentation);
  doubles.createRenderFlow.mockReturnValue(renderFlow);

  return {
    updates,
    interaction,
    widgetEvents,
    geometry,
    presentation,
    renderFlow
  };
}

/** Optional backend callbacks varied by one composition-root test. */
interface RuntimeOverrides {
  /** Observes focus after canonical presentation state changes. */
  readonly onFocusChange?: (focused: boolean) => void;
  /** Synchronizes the hidden input proxy. */
  readonly syncInputProxy?: (
    renderResult: QuireViewRenderResult,
    imePreedit: QuireImePreedit | undefined
  ) => void;
  /** Enables retained selection reuse. */
  readonly allowsSelectionReuse?: () => boolean;
  /** Reports whether document presentation is ready. */
  readonly isDocumentPresentationReady?: () => boolean;
}

/**
 * Creates the composition root over already-installed factory doubles.
 *
 * @param harness - Resource doubles returned by the mocked factories.
 * @param overrides - Optional backend callbacks varied by a test.
 * @returns Canonical paginated runtime under test.
 */
function createRuntime(
  harness: RuntimeHarness,
  overrides: RuntimeOverrides = {}
) {
  const options = {
    scheduling: {},
    interaction: {
      lifecycle: {},
      onFocusChange: overrides.onFocusChange
    },
    geometry: {},
    presentation: {
      lifecycle: {},
      syncInputProxy: overrides.syncInputProxy ?? vi.fn()
    },
    renderFlow: {
      lifecycle: {},
      allowsSelectionReuse: overrides.allowsSelectionReuse ?? (() => true),
      isDocumentPresentationReady:
        overrides.isDocumentPresentationReady ?? (() => true)
    }
  } as unknown as CreateMountedPaginatedRuntimeOptions;

  expect(doubles.createUpdates).not.toHaveBeenCalled();
  expect(harness.renderFlow.renderUpdate).not.toHaveBeenCalled();

  return createMountedPaginatedRuntime(options);
}

/**
 * Reads the options supplied to the first invocation of one resource factory.
 *
 * @param factory - Hoisted factory mock invoked by the composition root.
 * @returns Options captured by the first factory invocation.
 */
function firstFactoryOptions(factory: ReturnType<typeof vi.fn>) {
  const options = factory.mock.calls[0]?.[0];
  if (options === undefined) {
    throw new Error("Expected mounted paginated runtime factory invocation");
  }
  return options;
}

/**
 * Creates the minimum render artifact needed by ownership tests.
 *
 * @param label - Stable label used to distinguish committed revisions.
 * @returns Render result carrying distinct interaction and widget identities.
 */
function createRenderResult(label: string): QuireViewRenderResult {
  return {
    interactionSnapshot: { label },
    viewTargets: [{ label }]
  } as unknown as QuireViewRenderResult;
}
