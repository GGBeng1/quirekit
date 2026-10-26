import { describe, expect, it } from "vitest";
import { createEditor } from "../Editor";
import {
  QUIRE_TRANSACTION_ORIGIN_META_KEY,
  readQuireTransactionOrigin,
  setQuireTransactionOrigin
} from "./origin";

describe("Quire transaction origin", () => {
  it("writes and validates explicit root provenance", () => {
    const editor = createEditor();
    const transaction = setQuireTransactionOrigin(
      editor.state.pm.tr,
      "collaboration"
    );

    expect(readQuireTransactionOrigin(transaction)).toBe("collaboration");
    transaction.setMeta(QUIRE_TRANSACTION_ORIGIN_META_KEY, "unknown");
    expect(readQuireTransactionOrigin(transaction)).toBeUndefined();

    editor.destroy();
  });
});
