import { describe, expect, it, vi } from "vitest";
import { SuggestionController } from "./controller";
import type {
  SuggestionOverlayPort,
  SuggestionProvider,
  SuggestionProviderRequest,
  SuggestionResult,
  SuggestionSessionInput
} from "./types";

type Bookmark = { readonly from: number; readonly to: number };
type Action = { readonly type: "insert"; readonly value: string };

/** Deferred provider completion used to prove abort and late-result rejection. */
interface DeferredResults {
  /** Provider promise. */
  readonly promise: Promise<readonly SuggestionResult<Action>[]>;
  /** Resolves the provider promise. */
  readonly resolve: (results: readonly SuggestionResult<Action>[]) => void;
  /** Rejects the provider promise. */
  readonly reject: (reason?: unknown) => void;
}

/** Creates one manually settled provider result promise. */
function createDeferredResults(): DeferredResults {
  let resolve!: DeferredResults["resolve"];
  let reject!: DeferredResults["reject"];
  const promise = new Promise<readonly SuggestionResult<Action>[]>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** Creates an explicit session without consulting editor selection. */
function session(
  kind: "slash" | "mention" | "emoji",
  restoreFocus = vi.fn()
): SuggestionSessionInput<Bookmark> {
  return {
    root: {},
    trigger: {
      kind,
      text: kind === "slash" ? "/" : kind === "mention" ? "@" : ":"
    },
    query: "",
    target: {
      id: `${kind}-target`,
      generation: 1,
      bookmark: { from: 4, to: 5 }
    },
    restoreFocus
  };
}

/** Creates a command-neutral provider with one deterministic insertion action. */
function provider(
  id: string,
  trigger: "slash" | "mention" | "emoji",
  provide: SuggestionProvider<Bookmark, Action>["provide"] = () => [{
    id: `${id}-result`,
    label: id,
    action: { type: "insert", value: id }
  }]
): SuggestionProvider<Bookmark, Action> {
  return { id, trigger, group: `${trigger}-group`, provide };
}

/** Creates an observable overlay seam without document listeners. */
function overlay() {
  let active: Parameters<SuggestionOverlayPort["open"]>[0] | undefined;
  const releases: boolean[] = [];
  return {
    port: {
      open(input) { active = input; },
      release(restoreFocus) {
        const current = active;
        active = undefined;
        releases.push(restoreFocus);
        if (restoreFocus) current?.restoreFocus();
      }
    } satisfies SuggestionOverlayPort,
    releases,
    dismiss() { active?.dismiss(); },
    active() { return active; }
  };
}

describe("SuggestionController", () => {
  it.each(["slash", "mention", "emoji"] as const)(
    "normalizes %s trigger, provider, result, highlight, and accept state",
    async (kind) => {
      const surface = overlay();
      const controller = new SuggestionController({
        providers: [provider(`${kind}-provider`, kind)],
        overlay: surface.port
      });

      expect(controller.start(session(kind))).toBe(true);
      expect(controller.state).toMatchObject({
        phase: "loading",
        trigger: { kind },
        query: "",
        requestId: 1,
        highlightedIndex: null,
        cancelReason: null
      });
      await vi.waitFor(() => expect(controller.state.phase).toBe("ready"));
      expect(controller.state.results).toHaveLength(1);
      expect(controller.state.highlightedIndex).toBe(0);

      const acceptance = controller.acceptHighlighted();
      expect(acceptance).toMatchObject({
        trigger: { kind },
        target: { id: `${kind}-target`, generation: 1 },
        selection: {
          providerId: `${kind}-provider`,
          result: { action: { type: "insert", value: `${kind}-provider` } }
        }
      });
      expect(controller.state).toMatchObject({ phase: "idle", cancelReason: "accept" });
      expect(surface.releases).toEqual([true]);
    }
  );

  it("aborts superseded requests and rejects their late success or failure", async () => {
    const requests: SuggestionProviderRequest<Bookmark>[] = [];
    const deferred: DeferredResults[] = [];
    const surface = overlay();
    const controller = new SuggestionController({
      providers: [provider("async", "slash", (request) => {
        requests.push(request);
        const next = createDeferredResults();
        deferred.push(next);
        return next.promise;
      })],
      overlay: surface.port
    });

    controller.start(session("slash"));
    controller.updateQuery("new");
    expect(requests[0]?.signal.aborted).toBe(true);
    expect(requests[1]?.signal.aborted).toBe(false);
    deferred[0]?.resolve([{
      id: "late",
      label: "Late",
      action: { type: "insert", value: "late" }
    }]);
    await Promise.resolve();
    expect(controller.state.results).toEqual([]);
    controller.updateQuery("newer");
    expect(requests[1]?.signal.aborted).toBe(true);
    expect(requests[2]?.signal.aborted).toBe(false);
    deferred[1]?.reject(new Error("late failure"));
    await Promise.resolve();
    expect(controller.state).toMatchObject({ phase: "loading", requestId: 3 });
    deferred[2]?.resolve([{
      id: "current",
      label: "Current",
      action: { type: "insert", value: "current" }
    }]);
    await vi.waitFor(() => expect(controller.state.phase).toBe("ready"));
    expect(controller.state.results[0]?.result.id).toBe("current");
  });

  it("suppresses start, query, keyboard, and acceptance while IME owns preedit", async () => {
    const surface = overlay();
    const restoreFocus = vi.fn();
    const controller = new SuggestionController({
      providers: [provider("slash", "slash")],
      overlay: surface.port
    });

    controller.setComposing(true);
    expect(controller.start(session("slash"))).toBe(false);
    expect(controller.handleKey("Enter", true)).toEqual({ handled: false });
    controller.setComposing(false);
    controller.start(session("slash", restoreFocus));
    await vi.waitFor(() => expect(controller.state.phase).toBe("ready"));
    controller.setComposing(true);
    expect(controller.state).toMatchObject({
      phase: "idle",
      composing: true,
      cancelReason: "composition"
    });
    expect(controller.updateQuery("ignored")).toBe(false);
    expect(controller.acceptHighlighted()).toBeNull();
    expect(restoreFocus).toHaveBeenCalledOnce();
  });

  it("requeries after explicit remap and cancels deleted or regressed targets", async () => {
    const provide = vi.fn(() => []);
    const surface = overlay();
    const controller = new SuggestionController({
      providers: [provider("slash", "slash", provide)],
      overlay: surface.port
    });
    controller.start(session("slash"));
    await vi.waitFor(() => expect(controller.state.phase).toBe("empty"));

    expect(controller.remapTarget((target) => ({
      ...target,
      generation: 2,
      bookmark: { from: 8, to: 9 }
    }))).toBe(true);
    expect(controller.state.target).toMatchObject({
      generation: 2,
      bookmark: { from: 8, to: 9 }
    });
    expect(provide).toHaveBeenCalledTimes(2);
    expect(controller.remapTarget(() => null)).toBe(false);
    expect(controller.state).toMatchObject({
      phase: "idle",
      cancelReason: "target-stale",
      target: null
    });
  });

  it("wraps keyboard highlight and returns typed action without executing it", async () => {
    const execute = vi.fn();
    type TypedAction = { readonly type: "command"; readonly execute: typeof execute };
    const surface = overlay();
    const controller = new SuggestionController<Bookmark, TypedAction>({
      providers: [{
        id: "commands",
        trigger: "slash",
        group: "blocks",
        provide: () => ["one", "two"].map((id) => ({
          id,
          label: id,
          action: { type: "command", execute }
        }))
      }],
      overlay: surface.port
    });
    controller.start(session("slash"));
    await vi.waitFor(() => expect(controller.state.phase).toBe("ready"));

    expect(controller.handleKey("ArrowUp")).toEqual({ handled: true });
    expect(controller.state.highlightedIndex).toBe(1);
    const routed = controller.handleKey("Enter");
    expect(routed.handled).toBe(true);
    expect(routed.acceptance?.selection.result.id).toBe("two");
    expect(execute).not.toHaveBeenCalled();
    expect(controller.handleKey("Escape")).toEqual({ handled: false });
  });

  it("projects empty and sanitized error state and accepts overlay dismissal", async () => {
    const surface = overlay();
    const controller = new SuggestionController({
      providers: [
        provider("empty", "mention", () => []),
        provider("failed", "mention", () => Promise.reject(
          new Error("secret backend detail")
        ))
      ],
      overlay: surface.port
    });
    controller.start(session("mention"));
    await vi.waitFor(() => expect(controller.state.phase).toBe("error"));
    expect(controller.state.providers).toEqual([
      { id: "empty", group: "mention-group", phase: "empty" },
      {
        id: "failed",
        group: "mention-group",
        phase: "error",
        errorCode: "provider-failed"
      }
    ]);
    expect(JSON.stringify(controller.state)).not.toContain("secret backend detail");
    surface.dismiss();
    expect(controller.state).toMatchObject({
      phase: "idle",
      cancelReason: "overlay-dismiss"
    });
  });
});
