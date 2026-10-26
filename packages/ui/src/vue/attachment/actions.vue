<script setup lang="ts">
import { computed } from 'vue';
import type { QuireKitAttachmentAction, QuireKitAttachmentActionDetails, QuireKitAttachmentProps } from '../../components/attachment';
import QuireIconButton from '../button/icon-button.vue';
import QuireIcon from '../icon/icon.vue';
import { attachmentActions, attachmentActionIcons } from './model';
import { useQuireKitMessages } from '../locale-provider/context';
const props = defineProps<Pick<QuireKitAttachmentProps, 'item'> & { /** Place compact actions over media without a solid rectangular tray. */ overlay?: boolean }>();
const emit = defineEmits<{ /** 请求宿主执行当前允许的操作。 */ action: [details: QuireKitAttachmentActionDetails] }>();
const text = useQuireKitMessages('attachment');
const actions = computed(() => attachmentActions(props.item));
/** Check current authority at activation, including a change between pointer down and click.
 * @param action - Requested host intent.
 */
function request(action: QuireKitAttachmentAction): void {
  if (actions.value.includes(action)) emit('action', { attachmentId: props.item.id, action });
}
</script>
<template>
  <div v-if="actions.length" class="qk-attachment__actions">
    <QuireIconButton v-for="action in actions" :key="action" class="qk-attachment__action" size="xs" :data-action="action" :data-overlay="overlay || undefined"
      :shape="overlay ? 'circle' : 'rounded'" :variant="overlay ? 'solid' : 'ghost'"
      :label="text.forFile(text[action], item.name)" :title="text[action]" @click="request(action)">
      <QuireIcon class="qk-attachment__action-icon" :name="attachmentActionIcons[action]" :size="16" />
    </QuireIconButton>
  </div>
</template>
