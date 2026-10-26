import { Extension, type QuireAnyExtension } from "@quirekit/core";
import { BulletList } from "../bullet-list";
import { ListItem } from "../item";
import { ListKeymap } from "../keymap";
import { OrderedList } from "../ordered-list";
import type { ListKitOptions } from "../types";

/** Combined list extension kit. */
export const ListKit = Extension.create<ListKitOptions>({
  name: "listKit",

  addOptions() {
    return {
      bulletList: {},
      listItem: {},
      listKeymap: {},
      orderedList: {}
    };
  },

  addExtensions() {
    const extensions: QuireAnyExtension[] = [];

    if (this.options.bulletList !== false) {
      extensions.push(BulletList.configure(this.options.bulletList));
    }

    if (this.options.listItem !== false) {
      extensions.push(ListItem.configure(this.options.listItem));
    }

    if (this.options.listKeymap !== false) {
      extensions.push(ListKeymap.configure(this.options.listKeymap));
    }

    if (this.options.orderedList !== false) {
      extensions.push(OrderedList.configure(this.options.orderedList));
    }

    return extensions;
  }
});
