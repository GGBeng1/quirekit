import { describe, expect, it } from "vitest";
import { createActivityCoalescer, createActivityOutbox, createHintPairing, createSessionTracker, decodeActivityHint, encodeActivityHint, flushActivityOutbox } from ".";
import type { ActivityHint, WriterClock } from ".";
import { createMemoryActivityStore } from "../memory";

/** @returns A manual clock whose timers run when time advances. */
function manualClock(): WriterClock & { advance(ms: number): void } {
  let now = 0; const timers = new Set<{ at: number; run: () => void }>();
  return { now: () => now,
    schedule(run, ms) { const timer = { at: now + ms, run }; timers.add(timer); return () => timers.delete(timer); },
    advance(ms) {
      now += ms;
      for (const timer of [...timers].sort((a, b) => a.at - b.at)) if (timer.at <= now) { timers.delete(timer); timer.run(); }
    } };
}
const hint = (operationId: string, delta: number): ActivityHint => ({ type: "quirekit.activity.hint", version: 1, operationId, kind: "block.insert", kindVersion: 1, facts: {}, delta });

describe("activity hints", () => {
  it("round-trips and rejects other or malformed messages", () => {
    const payload = encodeActivityHint({ operationId: "op", kind: "block.insert", kindVersion: 1, facts: { type: "table" }, delta: 12 });
    expect(decodeActivityHint(payload)).toMatchObject({ operationId: "op", delta: 12 });
    expect(decodeActivityHint('{"type":"msfe.session"}')).toBeNull();
    expect(decodeActivityHint("not json")).toBeNull();
    expect(decodeActivityHint(payload.replace('"block.insert"', '"Bad Kind"'))).toBeNull();
  });
});

describe("hint pairing", () => {
  it("pairs in either order per connection and resolves unmatched changes after the hold", () => {
    const clock = manualClock(), resolved: string[] = [];
    const pairing = createHintPairing<{ id: string; delta: number }>({ clock, holdMs: 100, match: (change, item) => change.delta === item.delta,
      resolve: (change, item) => resolved.push(`${change.id}:${item?.operationId ?? "none"}`) });
    pairing.change("a", { id: "c1", delta: 5 }); pairing.hint("a", hint("h1", 5));
    pairing.hint("a", hint("h2", 3)); pairing.change("a", { id: "c2", delta: 3 });
    pairing.hint("b", hint("h3", 7)); pairing.change("a", { id: "c3", delta: 7 });
    clock.advance(100);
    pairing.change("a", { id: "c4", delta: 1 }); pairing.close("a");
    expect(resolved).toEqual(["c1:h1", "c2:h2", "c3:none", "c4:none"]);
  });
  it("resolves earlier unhinted changes of a connection before a hinted one", () => {
    const clock = manualClock(), resolved: string[] = [];
    const pairing = createHintPairing<{ id: string; delta: number }>({ clock, holdMs: 100, match: (change, item) => change.delta === item.delta,
      resolve: (change, item) => resolved.push(`${change.id}:${item?.operationId ?? "none"}`) });
    pairing.change("a", { id: "typing1", delta: 1 }); pairing.change("a", { id: "typing2", delta: 1 }); pairing.change("b", { id: "other", delta: 1 });
    pairing.change("a", { id: "undo", delta: -2 }); pairing.hint("a", hint("h-undo", -2));
    expect(resolved).toEqual(["typing1:none", "typing2:none", "undo:h-undo"]);
    clock.advance(100);
    expect(resolved.at(-1)).toBe("other:none");
  });
});

describe("coalescer", () => {
  it("merges mergeable candidates until a pause, a non-mergeable one or a rejected merge", () => {
    const clock = manualClock(), emitted: string[] = [];
    const coalescer = createActivityCoalescer<{ text: string; block: number }>({ clock, mergeMs: 100,
      canMerge: (open, next) => open.block === next.block, merge: (open, next) => ({ ...open, text: open.text + next.text }), emit: item => emitted.push(item.text) });
    coalescer.push("a", { text: "h", block: 1 }, true); clock.advance(50); coalescer.push("a", { text: "i", block: 1 }, true);
    coalescer.push("a", { text: "!", block: 2 }, true);
    coalescer.push("a", { text: "paste", block: 2 }, false);
    coalescer.push("a", { text: "x", block: 3 }, true); clock.advance(100);
    coalescer.push("b", { text: "y", block: 3 }, true);
    coalescer.update((_key, item) => item.block === 3 ? null : item);
    expect(emitted).toEqual(["hi", "!", "paste", "x", "y"]);
  });
});

describe("session tracker", () => {
  it("records one join per actor and keeps the session through quick reconnects", () => {
    const clock = manualClock(), emitted: string[] = [];
    const tracker = createSessionTracker({ clock, graceMs: 100, emit: (kind, actor) => emitted.push(`${kind}:${actor.id}`) });
    const alice = { id: "alice", trust: "verified" as const };
    tracker.connect(alice, "s1"); tracker.connect(alice, "s2"); tracker.disconnect("alice", "s1"); tracker.disconnect("alice", "s2");
    clock.advance(50); tracker.connect(alice, "s3"); clock.advance(200);
    tracker.disconnect("alice", "s3"); clock.advance(100);
    expect(emitted).toEqual(["session.join:alice", "session.leave:alice"]);
  });
});

describe("outbox", () => {
  it("hands pending events to the host and restores them after a failed append", async () => {
    const outbox = createActivityOutbox(), store = createMemoryActivityStore();
    const event = { documentId: "d", epoch: "e", operationId: "o", actor: { id: "u", trust: "verified" as const }, source: "human" as const, kind: "text.edit", kindVersion: 1, facts: {} };
    outbox.add("d", [event]);
    await expect(flushActivityOutbox(outbox, "d", { ...store, append: async () => { throw new Error("down"); } })).rejects.toThrow("down");
    expect(outbox.size("d")).toBe(1);
    await flushActivityOutbox(outbox, "d", store);
    expect(outbox.size("d")).toBe(0);
    expect(store.snapshot("d")).toHaveLength(1);
  });
});
