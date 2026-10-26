// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { Extension } from "../authoring/definition";
import { createMsfeEditor } from "../editor/create";
import type { MsfeChangeEvent, MsfeEditor } from "../editor/types";
import type { CommandProps, RawCommands } from "./types";
import { defineCommand, markChangeOrigin, planNamedCommand, readAiCapabilities, readCommandDescriptors } from "./agent";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

const Stamp = Extension.create({
  name: "stamp",
  addCommands() {
    return {
      stamp: defineCommand({
        description: "Adds a stamp at the selection.",
        target: "text",
        params: { type: "object", properties: { mark: { type: "string" } } },
        run: (options: { mark: string }) => ({ tr }: CommandProps) => tr.insertText(options.mark)
      }),
      plain: () => () => true
    } as unknown as Partial<RawCommands>;
  },
  addAiCapabilities() {
    return [{ kind: "source-block", names: ["Stamp"], present: () => undefined }];
  }
});

it("exposes described commands, their planners and AI facts", () => {
  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = createMsfeEditor({ parent, markdown: "hello", extensions: [Stamp] });
  editors.push(editor);
  expect([...readCommandDescriptors(editor).keys()]).toEqual(["stamp"]);
  expect(readCommandDescriptors(editor).get("stamp")?.target).toBe("text");
  expect(readAiCapabilities(editor)).toHaveLength(1);
  const events: MsfeChangeEvent[] = [];
  editor.onChange(event => events.push(event));
  const plan = planNamedCommand(editor, "stamp", [{ mark: "!" }])!;
  expect(editor.chain([markChangeOrigin("agent"), state => ({ selection: { anchor: state.doc.length } }), plan]).ok).toBe(true);
  expect(editor.getMarkdown()).toBe("hello!");
  expect(events.at(-1)?.origin).toBe("agent");
  expect(editor.undo()).toBe(true);
  expect(editor.getMarkdown()).toBe("hello");
  expect(planNamedCommand(editor, "missing", [])).toBeUndefined();
});
