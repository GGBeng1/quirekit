import type { ComputedRef, InjectionKey } from "vue";
import type { QuireKitDrawerSide } from "../../components/drawer";
import type { DrawerInteractionContext } from "./types";

/** Drawer 子组件读取逻辑边缘时使用的内部依赖注入键。 */
export const drawerSideKey: InjectionKey<ComputedRef<QuireKitDrawerSide>> = Symbol("quire-drawer-side");

/** Keeps closing and drag policies local to their owning Drawer. */
export const drawerInteractionKey: InjectionKey<DrawerInteractionContext> = Symbol("quire-drawer-interaction");
