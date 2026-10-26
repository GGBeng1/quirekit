import { systemClock } from "./clock";
import type { ActivityActor } from "../protocol/types";
import type { SessionTrackerOptions } from "./types";

/**
 * Turns connections into join and leave records per actor. Several connections of one actor form one session,
 * and a reconnect within the grace window continues it, so brief network drops do not flood the timeline.
 * @param options - Grace window, emission and timing.
 * @returns Connect and disconnect feeds.
 */
export function createSessionTracker(options: SessionTrackerOptions) {
  const clock = options.clock ?? systemClock, grace = options.graceMs ?? 60_000;
  const actors = new Map<string, { actor: ActivityActor; connections: Set<string>; leave?: () => void }>();
  return {
    /** @param actor - Authenticated actor. @param connection - Connection key. */
    connect(actor: ActivityActor, connection: string): void {
      const entry = actors.get(actor.id);
      if (entry) {
        entry.connections.add(connection);
        if (entry.leave) { entry.leave(); delete entry.leave; }
        return;
      }
      actors.set(actor.id, { actor, connections: new Set([connection]) });
      options.emit("session.join", actor, clock.now());
    },
    /** @param actorId - Actor identity. @param connection - Closed connection. */
    disconnect(actorId: string, connection: string): void {
      const entry = actors.get(actorId);
      if (!entry?.connections.delete(connection) || entry.connections.size) return;
      const left = clock.now();
      entry.leave = clock.schedule(() => { actors.delete(actorId); options.emit("session.leave", entry.actor, left); }, grace);
    },
  };
}
