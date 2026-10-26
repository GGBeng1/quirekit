import type { MathUiLocale, MathUiMessages } from './types';

/** Interface copy of the formula panel in each supported language. */
export const mathUiMessages: Readonly<Record<MathUiLocale, MathUiMessages>> = Object.freeze({
  'zh-CN': Object.freeze({
    panel: '公式编辑', toolbar: '公式模板', undo: '撤销', redo: '重做',
    hint: '选择上方分类或输入 \\ 搜索 · 点击公式或方框输入 · Tab 切换槽位 · 拖动或 Shift＋方向键选择',
    source: 'LaTeX 源码', sourceOptional: 'LaTeX 源码（可选）', reload: '放弃草稿并重新载入', cancel: '取消', confirm: '确定',
    conflict: '公式已在外部改变，请重新载入后编辑', diagnosticAt: (message: string, offset: number) => `${message}（位置 ${offset}）`,
    feedback: Object.freeze({
      'unsupported-input': '此操作不受支持，请选择公式模板或输入普通数学字符', 'unsupported-host': '公式包含暂不支持的写法，请在 LaTeX 源码中修改',
      'host-rejected': '公式未保存，草稿已保留', 'host-error': '保存失败，草稿已保留'
    }),
    diagnostics: Object.freeze({
      'unsupported-command': '不支持的命令', 'unexpected-token': '无法识别的写法', 'missing-argument': '缺少参数',
      'duplicate-script': '上标或下标重复', 'limit-exceeded': '公式源码过长'
    }),
    searchTemplates: '搜索所有公式模板', searchTemplatesPlaceholder: '搜索积分、数列、sin…', category: '公式分类', allCategories: '所有分类',
    gallery: '公式模板图库', searchCommands: '搜索公式结构或符号', searchCommandsPlaceholder: '搜索公式或符号…', commands: '公式结构与符号',
    noMatch: '没有匹配的公式或符号', rows: '行', columns: '列', rowCount: '矩阵行数', columnCount: '矩阵列数', matrixPreview: '矩阵预览',
    matrixBack: '返回形态', matrixInsert: '插入矩阵', input: '可视化公式输入',
    unrenderable: '此公式暂时无法显示', unrenderableInput: '此公式暂时无法显示，请调整内容后重试'
  }),
  en: Object.freeze({
    panel: 'Edit formula', toolbar: 'Formula templates', undo: 'Undo', redo: 'Redo',
    hint: 'Pick a category above or type \\ to search · Click the formula or a box to type · Tab moves between slots · Drag or Shift+arrows to select',
    source: 'LaTeX source', sourceOptional: 'LaTeX source (optional)', reload: 'Discard draft and reload', cancel: 'Cancel', confirm: 'OK',
    conflict: 'The formula changed elsewhere. Reload it to continue editing.', diagnosticAt: (message: string, offset: number) => `${message} (position ${offset})`,
    feedback: Object.freeze({
      'unsupported-input': 'This action is not supported. Choose a template or type ordinary math characters.',
      'unsupported-host': 'The formula uses notation that is not supported yet. Edit it in the LaTeX source.',
      'host-rejected': 'The formula was not saved. Your draft is kept.', 'host-error': 'Saving failed. Your draft is kept.'
    }),
    searchTemplates: 'Search all formula templates', searchTemplatesPlaceholder: 'Search integral, sequence, sin…', category: 'Formula category', allCategories: 'All categories',
    gallery: 'Formula template gallery', searchCommands: 'Search formula structures or symbols', searchCommandsPlaceholder: 'Search formulas or symbols…', commands: 'Formula structures and symbols',
    noMatch: 'No matching formulas or symbols', rows: 'Rows', columns: 'Columns', rowCount: 'Matrix rows', columnCount: 'Matrix columns', matrixPreview: 'Matrix preview',
    matrixBack: 'Back to shapes', matrixInsert: 'Insert matrix', input: 'Visual formula input',
    unrenderable: 'This formula cannot be displayed right now', unrenderableInput: 'This formula cannot be displayed right now. Adjust it and try again.'
  })
});
