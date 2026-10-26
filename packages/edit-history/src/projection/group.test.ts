import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "..";
import { groupActivities } from "..";

let sequence = 0;
/** @param actor - Actor id. @param at - ISO time. @param fields - Overrides. @returns A confirmed event. */
function event(actor: string, at: string, fields: Partial<ActivityEvent> = {}): ActivityEvent {
  sequence++;
  return { formatVersion: 1, id: `e${sequence}`, sequence, acceptedAt: at, retention: "full", documentId: "d", epoch: "e", operationId: `o${sequence}`,
    actor: { id: actor, trust: "verified" }, source: "human", kind: "text.edit", kindVersion: 1, facts: {}, ...fields };
}

describe("timeline grouping", () => {
  it("groups one actor's nearby events, newest first, without merging actors, sessions or days", () => {
    const events = [
      event("alice", "2026-10-14T23:59:00Z"), event("alice", "2026-10-15T00:00:30Z"), event("alice", "2026-10-15T00:01:00Z", { kind: "undo" }),
      event("bob", "2026-10-15T00:01:30Z"), event("alice", "2026-10-15T00:02:00Z"), event("alice", "2026-10-15T00:03:00Z", { sessionId: "s2" }),
      event("alice", "2026-10-15T00:10:00Z", { sessionId: "s2" }),
    ];
    const days = groupActivities(events.reverse(), { timeZone: "UTC" });
    expect(days.map(day => day.date)).toEqual(["2026-10-15", "2026-10-14"]);
    expect(days[0]!.groups.map(group => group.events.map(item => item.sequence))).toEqual([[7], [6], [5], [4], [3, 2]]);
    expect(days[0]!.groups.at(-1)!.lead.kind).toBe("undo");
    expect(days[1]!.groups[0]!.events.map(item => item.sequence)).toEqual([1]);
  });
  it("uses the viewer's time zone for calendar days", () => {
    const days = groupActivities([event("alice", "2026-10-14T17:00:00Z")], { timeZone: "Asia/Shanghai" });
    expect(days[0]!.date).toBe("2026-10-15");
  });
});
