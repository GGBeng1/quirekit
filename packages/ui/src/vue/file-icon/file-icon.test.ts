import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import FileIcon from './file-icon.vue';

it('renders standalone without an IconProvider, decoratively or with an explicit accessible label', async () => {
  const decorative = await renderToString(createSSRApp({ render: () => h(FileIcon, { name: 'proposal.docx' }) }));
  expect(decorative).toContain('data-kind="document"'); expect(decorative).toContain('aria-hidden="true"');
  expect(decorative).toContain('>W</text>'); expect(decorative).not.toContain('role="img"');
  const named = await renderToString(createSSRApp({ render: () => h(FileIcon, { name: 'video.mp4', label: '视频文件', size: 24 }) }));
  expect(named).toContain('role="img"'); expect(named).toContain('aria-label="视频文件"'); expect(named).toContain('height="30"');
});
