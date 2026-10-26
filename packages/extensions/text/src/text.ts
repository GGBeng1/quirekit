import { Node } from "@quirekit/core";
import { textDocxCodec } from "./docx";

/** Inline text node extension. */
export const Text = Node.create({
  name: "text",
  group: "inline",

  addDocx() {
    return textDocxCodec;
  }
});
