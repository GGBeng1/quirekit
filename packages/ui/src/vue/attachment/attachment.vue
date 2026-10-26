<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QuireKitAttachmentActionDetails, QuireKitAttachmentProps } from '../../components/attachment';
import QuireIcon from '../icon/icon.vue';
import QuireFileIcon from '../file-icon/file-icon.vue';
import QuireIconButton from '../button/icon-button.vue';
import QuireImage from '../image/image.vue';
import QuireProgress from '../progress/progress.vue';
import QuireShimmer from '../shimmer/shimmer.vue';
import AttachmentActions from './actions.vue';
import { attachmentIsImage, attachmentMeta, attachmentProgress } from './model';
import { useQuireKitMessages } from '../locale-provider/context';

const props = withDefaults(defineProps<QuireKitAttachmentProps>(), { layout: 'list', preview: true });
const emit = defineEmits<{ /** 请求宿主执行操作，绝不直接修改集合或发起业务请求。 */ action: [details: QuireKitAttachmentActionDetails] }>();
const text = useQuireKitMessages('attachment');
const state = computed(() => props.item.state ?? 'ready');
const progress = computed(() => attachmentProgress(props.item.progress));
const isImage = computed(() => attachmentIsImage(props.item));
const imageSource = computed(() => isImage.value && state.value !== 'unavailable' ? props.item.thumbnailUrl || props.item.url : undefined);
const previewFailed = ref(false);
watch(imageSource, () => { previewFailed.value = false; });
const status = computed(() => props.item.statusText || (state.value !== 'ready' ? text.value[state.value] : previewFailed.value ? text.value.previewError : ''));
const thumbnailSize = computed(() => props.layout === 'grid' ? '100%' : 'var(--qk-attachment-preview-size)');

</script>

<template>
  <div class="qk-attachment" :data-layout="layout" :data-state="state" :data-preview-failed="previewFailed" :data-media="isImage ? 'image' : 'file'" :data-attachment-id="item.id" :data-source="item.source">
    <div class="qk-attachment__preview">
      <QuireImage v-if="imageSource" :src="imageSource" :alt="item.alt ?? item.name" :title="item.name"
        :width="thumbnailSize" :height="layout === 'grid' ? 112 : thumbnailSize" :preview="preview" :preview-src="item.url || imageSource"
        :preview-hint="false" @error="previewFailed = true" @load="previewFailed = false">
        <template #placeholder><QuireIcon name="image" :size="layout === 'inline' ? 16 : 20" /></template>
        <template #error="{ retry }">
          <QuireIconButton class="qk-attachment__action" size="xs" :label="text.forFile(text.previewRetry, item.name)" :title="text.previewError" @click="retry"><QuireIcon class="qk-attachment__action-icon" name="refreshCw" :size="16" /></QuireIconButton>
        </template>
      </QuireImage>
      <QuireFileIcon v-else :name="item.name" :media-type="item.mediaType" :size="layout === 'inline' ? 18 : 28" />
    </div>
    <div class="qk-attachment__content">
      <span class="qk-attachment__name" :title="item.name" dir="auto">{{ item.name }}</span>
      <span v-if="layout !== 'inline' && !(layout === 'strip' && status) && attachmentMeta(item)" class="qk-attachment__meta">{{ attachmentMeta(item) }}</span>
      <span v-if="status" class="qk-attachment__status" :data-state="state" :title="status">
        <QuireShimmer v-if="state === 'uploading' && progress === null" :text="status" />
        <template v-else>{{ status }}<span v-if="state === 'uploading' && progress !== null"> · {{ Math.round(progress) }}%</span></template>
      </span>
    </div>
    <AttachmentActions :item="item" :overlay="layout === 'strip' && isImage" @action="emit('action', $event)" />
    <QuireProgress v-if="state === 'uploading' && progress !== null" class="qk-attachment__progress"
      :model-value="progress" :label="text.forFile(text.uploading, item.name)" size="sm" :show-label="false" :show-value="false" />
  </div>
</template>
