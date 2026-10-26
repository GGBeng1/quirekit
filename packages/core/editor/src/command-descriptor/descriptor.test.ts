import { describe, expect, it } from "vitest";
import { Editor } from "../Editor";
import { Extension } from "../extension";
import { Node } from "../Node";
import type { CommandProps } from "../types";
import { defineCommand, getCommandDescriptor, readCommandDescriptors } from "./descriptor";

const doc = Node.create({ name: "doc", topNode: true, content: "paragraph+" });
const paragraph = Node.create({ name: "paragraph", content: "text*" });
const text = Node.create({ name: "text" });

/** @param label - Text the command inserts. @returns Extension with one described and one plain command. */
const commandsOf = (name: string, label: string) => Extension.create({
  name,
  addCommands() {
    return {
      stamp: defineCommand({
        description: `Inserts ${label}.`,
        params: { type: "object", properties: { times: { type: "integer" } } },
        target: "text",
        run: (options?: { times?: number }) => ({ tr }: CommandProps) => { tr.insertText(label.repeat(options?.times ?? 1), 1); return true; }
      }),
      plain: () => () => true
    };
  }
});

describe("command descriptors", () => {
  it("keep the command callable as before and expose only described commands", () => {
    const editor = new Editor({ extensions: [doc, paragraph, text, commandsOf("stamps", "A")], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] } });
    expect(editor.commands.command((props: CommandProps) => (editor.extensionManager.commands.stamp!({ times: 2 }) as (p: CommandProps) => boolean)(props))).toBe(true);
    expect(editor.state.doc.textContent).toBe("AAx");
    expect([...readCommandDescriptors(editor).entries()]).toEqual([["stamp", { description: "Inserts A.", params: { type: "object", properties: { times: { type: "integer" } } }, target: "text" }]]);
    expect(getCommandDescriptor(editor.extensionManager.commands.plain!)).toBeUndefined();
    expect(Object.isFrozen(readCommandDescriptors(editor).get("stamp"))).toBe(true);
    editor.destroy();
  });

  it("follow the implementation that wins when a later extension overrides the command", () => {
    const editor = new Editor({ extensions: [doc, paragraph, text, commandsOf("first", "A"), commandsOf("second", "B")], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] } });
    expect(readCommandDescriptors(editor).get("stamp")?.description).toBe("Inserts B.");
    editor.commands.command((props: CommandProps) => (editor.extensionManager.commands.stamp!() as (p: CommandProps) => boolean)(props));
    expect(editor.state.doc.textContent).toBe("Bx");
    editor.destroy();
  });

  it("forwards the receiver to a command written as a function", () => {
    const receiver = { label: "C" };
    const run = function (this: { label: string }) { return () => this.label === "C"; };
    const command = defineCommand({ description: "Checks its receiver.", run });
    expect((command.call(receiver) as () => boolean)()).toBe(true);
    expect(getCommandDescriptor(command)?.description).toBe("Checks its receiver.");
  });
});
