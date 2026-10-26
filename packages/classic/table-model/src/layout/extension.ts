import { Extension } from "@quirekit/core";
import { createWordTableLayoutModel } from "./model";

/** Registers canonical table semantics in continuous documents without Word pagination. */
export const WordTableLayoutProfile = Extension.create({
  name: "wordTableLayout",
  /** @returns Only the table facet; other document semantics remain host-owned. */
  addDocumentProfiles() {
    return [{ id: "word-table", facets: ["table-model"], profile: {
      "table-model": createWordTableLayoutModel
    } }];
  }
});
