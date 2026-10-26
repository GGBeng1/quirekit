<script setup lang="ts">
import { TreeView, type TreeCollection, type TreeViewNodeState } from "@ark-ui/vue/tree-view";
import TreeCheckbox from "./tree-checkbox.vue";
import type {
  QuireKitTreeNode,
  QuireKitTreeViewNodeSlotProps
} from "../../components/tree-view";

/** 递归 TreeView 节点的内部属性。 */
interface Props {
  /** 当前节点。 */
  readonly node: QuireKitTreeNode;
  /** Whether node text also toggles cascading checks. */
  readonly checkable?: boolean;
  /** 当前节点在 collection 中的索引路径。 */
  readonly indexPath: number[];
  /** Ark 当前拥有的树 collection。 */
  readonly collection: TreeCollection<QuireKitTreeNode>;
}

/** 递归节点向根适配器转发的插槽。 */
interface Slots {
  /** 渲染分支节点的内容。 */
  readonly branch?: (props: QuireKitTreeViewNodeSlotProps) => unknown;
  /** 渲染叶子节点的内容。 */
  readonly item?: (props: QuireKitTreeViewNodeSlotProps) => unknown;
}

const props = defineProps<Props>();
defineSlots<Slots>();

/**
 * 将 Ark 节点状态收窄为稳定的公开插槽合同。
 *
 * @param state - Ark/Zag 为当前节点计算的状态。
 * @returns 不暴露框架内部字段的插槽属性。
 */
function getSlotProps(state: TreeViewNodeState): QuireKitTreeViewNodeSlotProps {
  return {
    node: props.node,
    indexPath: props.indexPath,
    depth: state.depth,
    isBranch: state.isBranch,
    expanded: state.expanded,
    selected: state.selected,
    focused: state.focused,
    disabled: state.disabled,
    loading: state.loading
  };
}
</script>

<template>
  <TreeView.NodeProvider :node="node" :index-path="indexPath">
    <TreeView.NodeContext v-slot="state">
      <TreeView.Branch v-if="state.isBranch" class="qk-tree-view__branch">
        <TreeView.BranchControl class="group qk-tree-view__branch-control">
          <TreeView.BranchTrigger class="qk-tree-view__branch-trigger">
            <TreeView.BranchIndicator class="qk-tree-view__branch-indicator">
              <svg class="qk-tree-view__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </TreeView.BranchIndicator>
          </TreeView.BranchTrigger>
          <TreeView.BranchText class="qk-tree-view__node-text">
            <TreeCheckbox v-if="checkable" :node="node" :collection="collection">
              <slot name="branch" v-bind="getSlotProps(state)">
              <span class="qk-tree-view__label">{{ node.label }}</span>
            </slot>
            </TreeCheckbox>
            <template v-else><slot name="branch" v-bind="getSlotProps(state)">
              <span class="qk-tree-view__label">{{ node.label }}</span>
            </slot></template>
          </TreeView.BranchText>
          <span v-if="state.loading" class="qk-tree-view__loading" aria-hidden="true" />
        </TreeView.BranchControl>
        <TreeView.BranchContent class="qk-tree-view__branch-content">
          <TreeView.BranchIndentGuide class="qk-tree-view__indent-guide" />
          <TreeNode
            v-for="(child, childIndex) in collection.getNodeChildren(node)"
            :key="child.id"
            :node="child"
            :index-path="[...indexPath, childIndex]"
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
        </TreeView.BranchContent>
      </TreeView.Branch>

      <TreeView.Item v-else class="group qk-tree-view__item">
        <span class="qk-tree-view__item-spacer" aria-hidden="true" />
        <TreeView.ItemText class="qk-tree-view__node-text">
          <TreeCheckbox v-if="checkable" :node="node" :collection="collection">
              <slot name="item" v-bind="getSlotProps(state)">
            <span class="qk-tree-view__label">{{ node.label }}</span>
          </slot>
            </TreeCheckbox>
            <template v-else><slot name="item" v-bind="getSlotProps(state)">
            <span class="qk-tree-view__label">{{ node.label }}</span>
          </slot></template>
        </TreeView.ItemText>
      </TreeView.Item>
    </TreeView.NodeContext>
  </TreeView.NodeProvider>
</template>
