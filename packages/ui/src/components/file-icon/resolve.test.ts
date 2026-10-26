import { expect, it } from 'vitest';
import { resolveQuireKitFileIdentity } from './resolve';

it.each([
  ['报告.DOCX', 'document'], ['预算.xlsx', 'spreadsheet'], ['统计.csv', 'spreadsheet'], ['计划.pptx', 'presentation'], ['审批.pdf', 'pdf'],
  ['录屏.mp4', 'video'], ['会议.MOV', 'video'], ['语音.flac', 'audio'], ['photo.avif', 'image'], ['备份.tar.gz', 'archive'],
  ['App.vue', 'code'], ['a.html', 'web'], ['readme.md', 'markdown'], ['记录.txt', 'text'], ['font.woff2', 'font'], ['界面.fig', 'design'], ['未知.xyz', 'file'], ['README', 'file']
])('classifies %s without a native File dependency', (name, kind) => {
  expect(resolveQuireKitFileIdentity({ name }).kind).toBe(kind);
});
it('uses explicit kind, then filename, then MIME, without interpreting markup', () => {
  expect(resolveQuireKitFileIdentity({ name: 'report.pdf', kind: 'document' })).toEqual({ kind: 'document', badge: 'W' });
  expect(resolveQuireKitFileIdentity({ name: 'report.docx', mediaType: 'application/octet-stream' }).kind).toBe('document');
  expect(resolveQuireKitFileIdentity({ mediaType: 'video/mp4; codecs=avc1' }).kind).toBe('video');
  expect(resolveQuireKitFileIdentity({ mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }).kind).toBe('spreadsheet');
  expect(resolveQuireKitFileIdentity({ name: '<script>oops</script>' })).toEqual({ kind: 'file', badge: 'FILE' });
});
