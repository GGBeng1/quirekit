import type { QuireKitAttachmentAction, QuireKitAttachmentItem } from '../../components/attachment';

/** 操作使用公共线性 Icon；资源身份由 FileIcon 单独表达。 */
export const attachmentActionIcons: Record<QuireKitAttachmentAction, string> = { open: 'externalLink', download: 'download', retry: 'refreshCw', remove: 'close' };

/** @param item - Host-owned resource projection. @returns Only explicit, currently executable intents. */
export function attachmentActions(item: QuireKitAttachmentItem): QuireKitAttachmentAction[] {
  const state = item.state ?? 'ready';
  return [...new Set(item.actions ?? [])].filter(action => action === 'remove' || (action === 'retry'
    ? state === 'failed' || state === 'unavailable' : (action === 'open' || action === 'download') && state === 'ready'));
}

/** @param value - Optional upload percentage. @returns Safe visual percentage or unknown. */
export function attachmentProgress(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}

/** @param item - File metadata, never a native File controller. @returns Short type/size text without invented values. */
export function attachmentMeta(item: QuireKitAttachmentItem): string {
  const extension = item.name.includes('.') ? item.name.split('.').pop()! : '';
  const type = /^[a-z\d+-]{1,10}$/i.test(extension) ? extension.toUpperCase() : '';
  if (item.size === undefined || !Number.isFinite(item.size) || item.size < 0) return type;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(4, Math.max(0, Math.floor(Math.log(item.size || 1) / Math.log(1024))));
  const size = `${Number((item.size / 1024 ** power).toFixed(power ? 1 : 0))} ${units[power]}`;
  return [type, size].filter(Boolean).join(' · ');
}

/** @param item - Host-provided MIME classification. @returns Whether an image resource can be displayed. */
export function attachmentIsImage(item: QuireKitAttachmentItem): boolean { return !!item.mediaType?.toLowerCase().startsWith('image/'); }
