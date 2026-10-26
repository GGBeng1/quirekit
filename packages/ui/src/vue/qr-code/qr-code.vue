<script setup lang="ts">
import { QrCode, useQrCode } from '@ark-ui/vue/qr-code';
import { computed, nextTick, useTemplateRef } from 'vue';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitQRCodeDownloadOptions, QuireKitQRCodeFormat, QuireKitQRCodeProps, QuireKitQRCodeSlots, QuireKitQRCodeStatus } from './types';

const props = withDefaults(defineProps<QuireKitQRCodeProps>(), {
  size: 160, errorCorrection: 'M',
});
const text = useQuireKitMessages('qrCode');
defineSlots<QuireKitQRCodeSlots>();
const root = useTemplateRef<HTMLDivElement>('root');
const resolvedSize = computed(() => Number.isFinite(props.size) && props.size > 0 ? props.size : 160);
const qrCode = useQrCode(computed(() => ({
  modelValue: props.value,
  pixelSize: 1,
  encoding: { ecc: props.errorCorrection, border: 4, invert: false, boostEcc: false },
})));

// The upstream computed encoder throws on capacity overflow. Contain it before
// mounting the provider, so invalid content never leaves a stale scannable image.
const available = computed(() => {
  if (props.value.length === 0) return { status: 'empty' as const, api: undefined };
  try {
    return { status: 'ready' as const, api: qrCode.value };
  } catch {
    return { status: 'error' as const, api: undefined };
  }
});
const status = computed<QuireKitQRCodeStatus>(() => available.value.status);

/**
 * Exports the current mounted symbol, including its explicit white quiet zone.
 * @param format - Lossless image format; defaults to png.
 * @returns Ark's image data URL, or a rejection when the symbol is unavailable.
 */
async function getDataUrl(format: QuireKitQRCodeFormat = 'png'): Promise<string> {
  await nextTick();
  if (!root.value?.isConnected || !available.value.api) throw new Error(text.value.unavailable);
  return available.value.api.getDataUrl(format === 'svg' ? 'image/svg+xml' : 'image/png');
}

/**
 * Requests a browser download while leaving feedback and retry behavior to the host.
 * @param options - Lossless format and optional complete filename.
 * @returns Completion of the download request.
 */
async function download(options: QuireKitQRCodeDownloadOptions = {}): Promise<void> {
  const format = options.format ?? 'png';
  const dataUrl = await getDataUrl(format);
  const doc = root.value?.ownerDocument;
  if (!doc) throw new Error(text.value.unmounted);
  const anchor = doc.createElement('a');
  anchor.href = dataUrl;
  anchor.download = options.fileName ?? `qr-code.${format}`;
  anchor.rel = 'noopener';
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

defineExpose({ status, getDataUrl, download });
</script>

<template>
  <div ref="root" class="qk-qr-code" :data-state="status" :style="{ '--qk-qr-code-size': `${resolvedSize}px` }" data-qk-not-prose>
    <QrCode.RootProvider v-if="available.api" :value="available.api" class="qk-qr-code__symbol">
      <QrCode.Frame class="qk-qr-code__frame" :width="resolvedSize" :height="resolvedSize" role="img" :aria-label="label" focusable="false" shape-rendering="crispEdges">
        <rect width="100%" height="100%" fill="#fff" />
        <QrCode.Pattern fill="#000" />
      </QrCode.Frame>
    </QrCode.RootProvider>
    <div v-else class="qk-qr-code__fallback" role="group" :aria-label="label">
      {{ status === 'empty' ? text.empty : text.error }}
    </div>
    <div v-if="$slots.actions" class="qk-qr-code__actions">
      <slot name="actions" :status="status" :get-data-url="getDataUrl" :download="download" />
    </div>
  </div>
</template>
