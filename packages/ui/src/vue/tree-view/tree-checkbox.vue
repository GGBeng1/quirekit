<script setup lang="ts">
import { computed } from 'vue';
import { TreeView, type TreeCollection } from '@ark-ui/vue/tree-view';
import type { QuireKitTreeNode } from '../../components/tree-view';

/** Internal checkbox adaptation for upstream disabled-subtree semantics. */
interface Props {
  /** Current tree node. */
  readonly node: QuireKitTreeNode;
  /** Same collection used by the owning Ark tree. */
  readonly collection: TreeCollection<QuireKitTreeNode>;
}
const props = defineProps<Props>();
const unavailable = computed(() => {
  const { node, collection } = props;
  if (node.disabled || collection.getParentNodes(node.id).some(parent => parent.disabled)) return true;
  return collection.isBranchNode(node) && !collection.getDescendantNodes(node.id).some(child =>
    !child.disabled && !collection.getParentNodes(child.id).some(parent => parent.disabled));
});
</script>

<template>
  <TreeView.NodeCheckbox class="qk-tree-view__checkbox" :aria-label="node.label"
    :aria-disabled="unavailable || undefined" :data-disabled="unavailable ? '' : undefined"
    @click.capture="unavailable && $event.preventDefault()">
    <span class="qk-tree-view__checkmark" aria-hidden="true" />
    <slot />
  </TreeView.NodeCheckbox>
</template>
