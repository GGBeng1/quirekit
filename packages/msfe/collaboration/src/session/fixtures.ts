import * as Y from "yjs";
import type { CollaborationCheckpoint, CollaborationManifest, CollaborationProviderFactory, CollaborationReceipt } from "./types";

/** In-memory authority used only by contract tests; never a product persistence claim. */
export class TestAuthority {
  readonly document = new Y.Doc();
  readonly persisted = new Y.Doc();
  readonly requests: CollaborationCheckpoint[] = [];
  epoch = "one";
  permission: "read" | "write" = "write";
  failSave = false;
  gate: Promise<void> | undefined;
  wrongReceipt = false;
  private readonly clients = new Set<Y.Doc>();

  /** @param text - Uniquely initialized authority text. */
  constructor(text = "source") {
    this.document.getText("source").insert(0, text);
    this.document.on("update", update => { for (const doc of this.clients) Y.applyUpdate(doc, update, this); });
  }

  /** @returns Driver factory exercising the public provider contract. */
  provider(): CollaborationProviderFactory {
    return context => {
      /** @param update - Locally accepted update. @param _origin - Yjs origin. @param _doc - Owner. @param transaction - Local/remote indicator. */
      const send = (update: Uint8Array, _origin: unknown, _doc: Y.Doc, transaction: Y.Transaction) => {
        if (transaction.local && this.permission === "write") Y.applyUpdate(this.document, update, context.document);
      };
      /** Unsubscribes only this transport; shared source remains available. */
      const disconnect = () => { this.clients.delete(context.document); context.document.off("update", send); context.report({ connection: "disconnected", synced: false }); };
      return {
        open: async () => ({ documentId: context.documentId, epoch: this.epoch, permission: this.permission,
          sourceFormat: { lineEnding: "\n", bom: false } } satisfies CollaborationManifest),
        connect: async () => {
          this.clients.add(context.document);
          Y.applyUpdate(context.document, Y.encodeStateAsUpdate(this.document), this);
          if (this.permission === "write") Y.applyUpdate(this.document, Y.encodeStateAsUpdate(context.document), context.document);
          context.document.on("update", send); context.report({ connection: "connected", synced: true });
        }, disconnect, destroy: disconnect,
        saveCheckpoint: async checkpoint => {
          this.requests.push(checkpoint); await this.gate;
          if (this.failSave) throw new Error("storage-failed");
          Y.applyUpdate(this.document, checkpoint.update, this);
          Y.applyUpdate(this.persisted, Y.encodeStateAsUpdate(this.document), this);
          return { documentId: checkpoint.documentId, epoch: checkpoint.epoch,
            requestId: this.wrongReceipt ? "wrong" : checkpoint.requestId, revision: "saved" } satisfies CollaborationReceipt;
        },
      };
    };
  }

  /** Releases the fake authority after every contract test. */
  destroy(): void { this.clients.clear(); this.document.destroy(); this.persisted.destroy(); }
}
