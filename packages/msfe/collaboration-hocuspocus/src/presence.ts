import type { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { Awareness } from "y-protocols/awareness";
import type { Doc } from "yjs";
import type { CollaborationPresenceTransport } from "@quirekit/msfe-collaboration";

// A reconnect creates a new provider, but the same source client must not restart its Awareness clock.
const clocks = new WeakMap<Doc, number>();

/** @param provider - Already connected source transport. @param socket - Its existing socket.
 * @param released - Clears the driver's optional capability. @returns One owned ephemeral lease, allocated on demand. */
export function acquireHocuspocusPresence(provider: HocuspocusProvider, socket: HocuspocusProviderWebsocket,
  released: () => void): CollaborationPresenceTransport {
  const awareness = new Awareness(provider.document), listeners = new Set<() => void>();
  const id = awareness.clientID;
  awareness.setLocalState(null);
  awareness.meta.set(id, { clock: Math.max(awareness.meta.get(id)!.clock, clocks.get(provider.document) ?? 0), lastUpdated: Date.now() });
  const join = `${id}:${awareness.meta.get(id)!.clock + 1}`, seen = new Map<number, string>();
  let disposed = false;
  /** @param event - Semantic Awareness changes; heartbeat updates never enter this path. */
  const changed = (event: { added: number[]; updated: number[] }) => {
    if (disposed) return;
    // Hocuspocus 4.7's socket QueryAwareness path does not reply. Announce a lease incarnation;
    // existing MSFE consumers answer it once, so late opt-in never waits for the next heartbeat.
    let announce = false;
    for (const client of [...event.added, ...event.updated].slice(0, 100)) {
      const peerJoin = awareness.getStates().get(client)?.msfeJoin;
      if (client === id || typeof peerJoin !== "string" || peerJoin.length > 64 || seen.get(client) === peerJoin) continue;
      if (seen.size >= 100 && !seen.has(client)) seen.delete(seen.keys().next().value!);
      seen.set(client, peerJoin); announce = true;
    }
    if (announce && awareness.getLocalState()) awareness.setLocalState(awareness.getLocalState());
    for (const listener of listeners) listener();
  };
  provider.setConfiguration({ awareness, websocketProvider: socket });
  awareness.on("update", provider.boundAwarenessUpdateHandler);
  awareness.on("change", changed);
  awareness.setLocalState({ msfe: null, msfeJoin: join });
  return {
    clientId: String(id),
    /** @returns Isolated display payloads from at most 100 inspected Awareness entries, including empty fields. */
    getStates() {
      const states = new Map<string, unknown>();
      if (disposed) return states;
      let inspected = 0;
      for (const [key, value] of awareness.getStates()) {
        if (++inspected > 100) break;
        const payload = value.msfe;
        if (payload != null) states.set(String(key), payload);
      }
      return states;
    },
    /** @param state - Bounded ephemeral display payload, or null on departure. */
    publish(state) { if (!disposed) awareness.setLocalState({ msfe: state, msfeJoin: join }); },
    /** @param listener - Roster or cursor state change. @returns Unsubscribe callback. */
    subscribe(listener) { if (!disposed) listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Withdraws before stopping the wire, then removes every timer and callback. */
    release() {
      if (disposed) return; disposed = true;
      // A field tombstone also reaches servers that drop a null-state delta while normalizing Awareness.
      awareness.setLocalState({ msfe: null, msfeJoin: null });
      awareness.setLocalState(null); clocks.set(provider.document, awareness.meta.get(id)!.clock);
      awareness.off("update", provider.boundAwarenessUpdateHandler); awareness.off("change", changed); listeners.clear();
      provider.setConfiguration({ awareness: null, websocketProvider: socket });
      awareness.destroy(); released();
    },
  };
}
