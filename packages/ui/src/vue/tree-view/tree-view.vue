<script setup lang="ts">
import {
  TreeView,
  type TreeViewExpandedChangeDetails,
  type TreeViewLoadChildrenCompleteDetails,
  type TreeViewLoadChildrenDetails,
  type TreeViewLoadChildrenErrorDetails,
  type TreeViewSelectionChangeDetails
} from "@ark-ui/vue/tree-view";
import { computed } from "vue";
import type {
  QuireKitTreeNode,
  QuireKitTreeViewExpandedChangeDetails as PublicExpandedChangeDetails,
  QuireKitTreeViewLoadChildren,
  QuireKitTreeViewLoadErrorDetails,
  QuireKitTreeViewNodeSlotProps,
  QuireKitTreeViewSelectionChangeDetails as PublicSelectionChangeDetails,
  QuireKitTreeViewSelectionAppearance,
  QuireKitTreeViewSelectionMode
} from "../../components/tree-view";
import TreeNode from "./tree-node.vue";
import { useTreeCollection } from "./use-collection";

/** Vue TreeView 的公开属性。 */
interface Props {
  /** TreeView 的可访问名称。 */
  readonly label: string;
  /** 显示级联复选框；Space 切换当前节点的勾选。 */
  readonly checkable?: boolean;
  /** 非受控的初始叶子勾选值。 */
  readonly defaultCheckedValue?: string[];
  /** 按 DOM 顺序组织的根节点。 */
  readonly nodes: readonly QuireKitTreeNode[];
  /** 未受控使用时初始展开的节点标识。 */
  readonly defaultExpandedValue?: string[];
  /** 未受控使用时初始选择的节点标识。 */
  readonly defaultSelectedValue?: string[];
  /** 单选或多选。 */
  readonly selectionMode?: QuireKitTreeViewSelectionMode;
  /** 选中节点使用背景或主题色文字反馈。 */
  readonly selectionAppearance?: QuireKitTreeViewSelectionAppearance;
  /** 是否显示层级引导线；默认显示，关闭时保留节点缩进。 */
  readonly showIndentGuides?: boolean;
  /** 点击分支正文时是否同时展开或收起。 */
  readonly expandOnClick?: boolean;
  /** 是否启用按可见文本首字符导航。 */
  readonly typeahead?: boolean;
  /** 按需加载尚不存在的直接子节点。 */
  readonly loadChildren?: QuireKitTreeViewLoadChildren;
  /** 是否延迟挂载从未展开过的分支内容。 */
  readonly lazyMount?: boolean;
  /** 分支收起后是否卸载其内容。 */
  readonly unmountOnExit?: boolean;
}

/** TreeView 的可替换内容位置。 */
interface Slots {
  /** 替换每个分支节点的可见内容。 */
  readonly branch?: (props: QuireKitTreeViewNodeSlotProps) => unknown;
  /** 替换每个叶子节点的可见内容。 */
  readonly item?: (props: QuireKitTreeViewNodeSlotProps) => unknown;
}

/** TreeView 发出的公开语义事件。 */
interface Emits {
  /** 展开集合变化后触发。 */
  expandedChange: [details: PublicExpandedChangeDetails];
  /** 选择集合变化后触发。 */
  selectionChange: [details: PublicSelectionChangeDetails];
  /** 异步子节点加载并写入 collection 后触发。 */
  loadChildrenComplete: [nodes: readonly QuireKitTreeNode[]];
  /** 一个或多个异步分支加载失败后触发。 */
  loadChildrenError: [details: readonly QuireKitTreeViewLoadErrorDetails[]];
}

const props = withDefaults(defineProps<Props>(), {
  checkable: false,
  defaultCheckedValue: () => [],
  defaultExpandedValue: () => [],
  defaultSelectedValue: () => [],
  selectionMode: "single",
  selectionAppearance: "background",
  showIndentGuides: true,
  expandOnClick: true,
  typeahead: true,
  lazyMount: false,
  unmountOnExit: false
});
const checkedValue = defineModel<string[] | undefined>("checkedValue");
const expandedValue = defineModel<string[] | undefined>("expandedValue");
const selectedValue = defineModel<string[] | undefined>("selectedValue");
const emit = defineEmits<Emits>();
defineSlots<Slots>();

const { collection, rootNodes, replaceCollection } = useTreeCollection(() => props.nodes, () => props.label, () => props.checkable);
const optionalRootProps = computed(() => ({
  ...(checkedValue.value === undefined
    ? { defaultCheckedValue: props.defaultCheckedValue }
    : { checkedValue: checkedValue.value }),
  ...(expandedValue.value === undefined
    ? { defaultExpandedValue: props.defaultExpandedValue }
    : { expandedValue: expandedValue.value }),
  ...(selectedValue.value === undefined
    ? { defaultSelectedValue: props.defaultSelectedValue }
    : { selectedValue: selectedValue.value }),
  ...(props.loadChildren === undefined ? {} : { loadChildren: loadNodeChildren })
}));

/**
 * 将公开加载函数装配为 Ark 的可取消异步合同。
 *
 * @param details - 待加载节点与本次加载的取消信号。
 * @returns 新加载的直接子节点。
 */
async function loadNodeChildren(
  details: TreeViewLoadChildrenDetails<QuireKitTreeNode>
): Promise<QuireKitTreeNode[]> {
  const children = await props.loadChildren!(details.node, details.signal);
  return [...children];
}

/**
 * 同步并公开展开状态。
 *
 * @param details - Ark 报告的展开状态详情。
 */
function handleExpandedChange(details: TreeViewExpandedChangeDetails<QuireKitTreeNode>): void {
  expandedValue.value = details.expandedValue;
  emit("expandedChange", {
    expandedValue: details.expandedValue,
    focusedValue: details.focusedValue
  });
}

/**
 * 同步并公开选择状态。
 *
 * @param details - Ark 报告的选择状态详情。
 */
function handleSelectionChange(details: TreeViewSelectionChangeDetails<QuireKitTreeNode>): void {
  selectedValue.value = details.selectedValue;
  emit("selectionChange", {
    selectedValue: details.selectedValue,
    focusedValue: details.focusedValue
  });
}

/**
 * 接管 Ark 返回的新 collection，使异步节点立即进入递归渲染。
 *
 * @param details - 包含已替换子节点的新 collection。
 */
function handleLoadComplete(
  details: TreeViewLoadChildrenCompleteDetails<QuireKitTreeNode>
): void {
  replaceCollection(details.collection);
  emit("loadChildrenComplete", rootNodes.value);
}

/**
 * 将 Ark 的批量失败详情收窄为稳定公开合同。
 *
 * @param details - 一个或多个节点的加载失败详情。
 */
function handleLoadError(details: TreeViewLoadChildrenErrorDetails<QuireKitTreeNode>): void {
  emit(
    "loadChildrenError",
    details.nodes.map(({ node, error }) => ({ node, error }))
  );
}
/** Delegates checkable Space activation to Ark's checkbox rather than row selection.
 * @param event - Keyboard event from the tree's current roving treeitem.
 */
function checkWithKeyboard(event: KeyboardEvent): void {
  if (!props.checkable || event.key !== " " || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
  const item = event.target as HTMLElement;
  if (item.getAttribute("role") !== "treeitem" || item.hasAttribute("data-disabled")) return;
  event.preventDefault();
  event.stopPropagation();
  item.querySelector<HTMLElement>('[data-part="node-checkbox"]')?.click();
}
</script>

<template>
  <TreeView.Root
    v-bind="optionalRootProps"
    :collection="collection"
    :selection-mode="selectionMode"
    :expand-on-click="expandOnClick"
    :typeahead="typeahead"
    :lazy-mount="lazyMount"
    :unmount-on-exit="unmountOnExit"
    :class="['qk-tree-view', `qk-tree-view--selection-${selectionAppearance}`, !showIndentGuides && 'qk-tree-view--hide-guides']"
    @checked-change="checkedValue = $event.checkedValue"
    @keydown.capture="checkWithKeyboard"
    @expanded-change="handleExpandedChange"
    @selection-change="handleSelectionChange"
    @load-children-complete="handleLoadComplete"
    @load-children-error="handleLoadError"
  >
    <TreeView.Label class="qk-tree-view__root-label">{{ label }}</TreeView.Label>
    <TreeView.Tree :aria-label="label" class="qk-tree-view__tree">
      <TreeNode
        v-for="(node, index) in rootNodes"
        :key="node.id"
        :node="node"
        :index-path="[index]"
        :collection="collection"
        :checkable="checkable"
      >
        <template #branch="slotProps">
          <slot name="branch" v-bind="slotProps">
            <span class="qk-tree-view__label">{{ slotProps.node.label }}</span>
          </slot>
        </template>
        <template #item="slotProps">
          <slot name="item" v-bind="slotProps">
            <span class="qk-tree-view__label">{{ slotProps.node.label }}</span>
          </slot>
        </template>
      </TreeNode>
    </TreeView.Tree>
  </TreeView.Root>
</template>
