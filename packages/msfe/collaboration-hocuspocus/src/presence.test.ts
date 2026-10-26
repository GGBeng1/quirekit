import { expect, it } from "vitest";
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import * as Y from "yjs";
import { acquireHocuspocusPresence } from "./presence";

it("bounds transport reads before filtering empty or unrelated Awareness states", () => {
  const document = new Y.Doc();
  const socket = new HocuspocusProviderWebsocket({ url: "ws://127.0.0.1:1", autoConnect: false });
  const provider = new HocuspocusProvider({ document, name: "bounded-presence", websocketProvider: socket, awareness: null });
  const lease = acquireHocuspocusPresence(provider, socket, () => {});
  try {
    const states = provider.awareness!.getStates(); states.clear();
    let reads = 0;
    for (let index = 0; index < 1_000; index++) states.set(index, {
      /** @returns A counted display payload; empty host fields must consume the same inspection budget. */
      get msfe() { reads++; return index < 70 ? null : { name: `Peer ${index}` }; },
    });
    const peers = lease.getStates();
    expect(reads).toBe(100);
    expect(peers.size).toBe(30);
    expect(peers.get("99")).toEqual({ name: "Peer 99" });
    expect(peers.has("100")).toBe(false);
    expect(document.getText("source").length).toBe(0);
  } finally {
    lease.release(); socket.destroy(); provider.destroy(); document.destroy();
  }
});
