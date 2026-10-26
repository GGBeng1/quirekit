import { Extension } from "@quirekit/core";
import { blockTextMenu } from "./text";
import { blockListMenu } from "../../lists/menu";
import { blockDataViewMenu } from "../../data-view/menu";

/** Product adapters for installed semantic features; the menu renderer knows none of their node types. */
export const BlockContextMenus = Extension.create({
  name: "blockContextMenus",
  /** @returns Feature-owned operation providers, collected by the shared editor UI layer. */
  addBlockMenuProviders() { return [blockTextMenu, blockListMenu, blockDataViewMenu]; }
});
