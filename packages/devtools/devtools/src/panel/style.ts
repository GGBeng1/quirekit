/**
 * Renders styles scoped by devtools class names.
 *
 * @returns Style element HTML.
 */
export function renderPanelStyles(): string {
  return `
<style>
.qk-devtools-root{--qk-bg:#07090b;--qk-panel:#0d1114;--qk-panel-2:#11161a;--qk-panel-3:#161d22;--qk-line:#263039;--qk-line-soft:#1c242b;--qk-text:#f0f5f3;--qk-muted:#87949c;--qk-dim:#5f6a71;--qk-green:#00dc82;--qk-green-soft:#10281f;--qk-cyan:#7dd3fc;--qk-yellow:#ffd166;--qk-red:#ff6b6b;--qk-purple:#c4a7ff;font:12px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--qk-text);box-sizing:border-box;pointer-events:none}
.qk-devtools-root *{box-sizing:border-box}
.qk-devtools-icon{width:15px;height:15px;flex:0 0 auto;stroke-width:2}
.qk-devtools-logo{width:24px;height:24px;flex:0 0 auto;filter:drop-shadow(0 0 10px rgba(0,220,130,.24))}
.qk-devtools-launcher{position:fixed;right:var(--qk-devtools-launcher-inline-end,18px);bottom:var(--qk-devtools-launcher-block-end,18px);z-index:2147483000;display:inline-flex;align-items:center;gap:9px;height:40px;max-width:calc(100vw - 36px);padding:0 12px 0 9px;border:1px solid #234031;border-radius:8px;background:#09120f;color:var(--qk-text);box-shadow:0 12px 32px rgba(0,0,0,.36);font:750 12px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;pointer-events:auto}
.qk-devtools-root[data-open="true"] .qk-devtools-launcher{display:none}
.qk-devtools-launcher:focus-visible,.qk-devtools-icon-button:focus-visible,.qk-devtools-rail button:focus-visible,.qk-devtools-page__actions button:focus-visible,.qk-devtools-json-tree__toggle:focus-visible,.qk-devtools-interaction-row:focus-visible,.qk-devtools-export-bar button:focus-visible,.qk-devtools-export-count input:focus-visible,.qk-devtools-drag-handle:focus-visible{outline:2px solid var(--qk-green);outline-offset:-2px}
.qk-devtools-launcher__label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qk-devtools-launcher__count{max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-left:1px solid #20332a;padding-left:9px;color:#9fb8ad;font-weight:700;text-align:right}
.qk-devtools-shell{position:fixed;left:0;right:0;bottom:0;z-index:2147482999;display:grid;place-items:end center;padding:0 14px 14px;pointer-events:none}
.qk-devtools-root[data-open="false"] .qk-devtools-shell{display:none}
.qk-devtools-root[data-fullscreen="true"] .qk-devtools-shell{top:0;padding:8px;place-items:stretch}
.qk-devtools-panel{position:relative;width:min(1180px,calc(100vw - 28px));height:min(560px,58vh);min-height:320px;max-height:calc(100vh - 28px);display:flex;flex-direction:column;overflow:hidden;resize:vertical;border:1px solid #2b373f;border-radius:8px;background:var(--qk-bg);box-shadow:0 24px 78px rgba(0,0,0,.5);pointer-events:auto}
.qk-devtools-root[data-fullscreen="true"] .qk-devtools-panel{width:100%;height:100%;max-height:none;resize:none}
.qk-devtools-topbar{height:44px;flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:0 10px 0 14px;border-bottom:1px solid var(--qk-line);background:linear-gradient(180deg,#11171b,#0b0f12);cursor:grab}
.qk-devtools-brand{display:flex;align-items:center;gap:9px;min-width:176px}
.qk-devtools-brand div{display:flex;align-items:baseline;gap:7px}
.qk-devtools-brand strong{font-size:13px;letter-spacing:0;color:#f7fbf9}
.qk-devtools-brand span{color:var(--qk-green);font:800 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase}
.qk-devtools-status{flex:1;min-width:0;display:flex;align-items:center;gap:12px;overflow:hidden;color:var(--qk-muted);font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-status span{color:#b0bcc3}
.qk-devtools-drag-handle{width:28px;height:28px;flex:0 0 auto;display:grid;place-items:center;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--qk-dim);cursor:grab}
.qk-devtools-drag-handle:active{cursor:grabbing;color:var(--qk-green);background:var(--qk-green-soft);border-color:#244f3b}
.qk-devtools-export-bar{flex:0 1 auto;min-width:0;display:flex;align-items:center;gap:6px}
.qk-devtools-export-bar button{height:28px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--qk-line);border-radius:6px;background:var(--qk-panel-2);color:#dce6e1;padding:0 8px;font:750 11px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.qk-devtools-export-bar .qk-devtools-icon{width:13px;height:13px;color:#9fb8ad}
.qk-devtools-export-count{height:28px;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--qk-line);border-radius:6px;background:#090d10;color:var(--qk-muted);padding:0 6px;font:750 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase}
.qk-devtools-export-count input{width:42px;height:22px;border:0;border-left:1px solid var(--qk-line);background:transparent;color:var(--qk-text);padding:0 0 0 6px;font:750 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;outline:none}
.qk-devtools-export-count input::-webkit-outer-spin-button,.qk-devtools-export-count input::-webkit-inner-spin-button{margin:0}
.qk-devtools-icon-button{width:28px;height:28px;flex:0 0 auto;display:grid;place-items:center;border:1px solid var(--qk-line);border-radius:6px;background:var(--qk-panel-2);color:var(--qk-muted);cursor:pointer}
.qk-devtools-layout{min-height:0;flex:1;display:grid;grid-template-columns:176px minmax(0,1fr)}
.qk-devtools-rail{min-height:0;display:flex;flex-direction:column;gap:4px;padding:10px;border-right:1px solid var(--qk-line);background:var(--qk-panel)}
.qk-devtools-rail button{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:8px;width:100%;min-height:36px;padding:0 9px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--qk-muted);font:700 12px/1 ui-sans-serif,system-ui,sans-serif;text-align:left;cursor:pointer}
.qk-devtools-rail button[aria-selected="true"]{border-color:#244f3b;background:var(--qk-green-soft);color:var(--qk-text)}
.qk-devtools-rail .qk-devtools-icon{color:#9fb8ad}
.qk-devtools-rail button[aria-selected="true"] .qk-devtools-icon{color:var(--qk-green)}
.qk-devtools-rail small{color:var(--qk-dim);font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-workspace{min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);background:#07090b}
.qk-devtools-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:1px;border-bottom:1px solid var(--qk-line);background:var(--qk-line)}
.qk-devtools-metric{min-width:0;background:#0b0f12;padding:9px 12px}
.qk-devtools-metric span{display:block;color:var(--qk-dim);font:750 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase}
.qk-devtools-metric strong{display:block;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:16px;line-height:1.1}
.qk-devtools-page{min-height:0;display:flex;flex-direction:column;gap:10px;padding:12px;overflow:hidden}
.qk-devtools-page__head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
.qk-devtools-page__head h3,.qk-devtools-page__head p{margin:0}
.qk-devtools-page__head h3{font-size:14px;line-height:1.2;font-weight:800;color:var(--qk-text)}
.qk-devtools-page__head p{margin-top:2px;color:var(--qk-muted);font-size:11px}
.qk-devtools-filter-toggle{height:28px;display:inline-flex;align-items:center;gap:7px;border:1px solid var(--qk-line);border-radius:6px;background:var(--qk-panel-2);color:#dce6e1;padding:0 8px;font:750 11px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.qk-devtools-filter-toggle input{width:14px;height:14px;margin:0;accent-color:var(--qk-green)}
.qk-devtools-filter-toggle small{color:var(--qk-muted);font:750 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-page__actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.qk-devtools-page__actions button{height:28px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--qk-line);border-radius:6px;background:var(--qk-panel-2);color:#dce6e1;padding:0 9px;font:750 11px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.qk-devtools-page__actions .qk-devtools-icon{width:14px;height:14px;color:#9fb8ad}
.qk-devtools-json-toolbar{flex:0 0 auto;display:grid;grid-template-columns:minmax(160px,320px) auto;align-items:center;gap:10px}
.qk-devtools-json-toolbar__search{position:relative;min-width:0}
.qk-devtools-json-toolbar__search .qk-devtools-icon{position:absolute;left:9px;top:50%;width:14px;height:14px;transform:translateY(-50%);color:var(--qk-dim);pointer-events:none}
.qk-devtools-json-toolbar input{height:30px;width:100%;border:1px solid var(--qk-line);border-radius:6px;background:#090d10;color:var(--qk-text);padding:0 10px 0 30px;font:12px/1 ui-sans-serif,system-ui,sans-serif;outline:none}
.qk-devtools-json-toolbar input:focus{border-color:#2a8f65;box-shadow:0 0 0 2px rgba(0,220,130,.18)}
.qk-devtools-json-toolbar span{color:var(--qk-muted);font:700 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-json-tree{min-height:0;flex:1;overflow:auto;border:1px solid var(--qk-line);border-radius:7px;background:#070b09;padding:8px 0;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-json-tree__row{position:relative;display:flex;align-items:center;gap:6px;min-width:max-content;min-height:24px;padding:1px 12px 1px calc(12px + var(--qk-json-level) * 18px);border-left:2px solid transparent;color:#dce6e1}
.qk-devtools-json-tree__row::before{content:"";position:absolute;left:calc(20px + var(--qk-json-level) * 18px);top:0;bottom:0;border-left:1px solid rgba(125,211,252,.18)}
.qk-devtools-json-tree__row[data-match="true"]{background:rgba(255,209,102,.13);border-left-color:var(--qk-yellow)}
.qk-devtools-json-tree__toggle{position:relative;z-index:1;width:18px;height:18px;display:grid;place-items:center;border:0;border-radius:4px;background:transparent;color:var(--qk-green);cursor:pointer}
.qk-devtools-json-tree__toggle .qk-devtools-icon{width:14px;height:14px}
.qk-devtools-json-tree__spacer{width:18px;flex:0 0 auto}
.qk-devtools-json-tree__key{position:relative;z-index:1;color:#9be7d4;font-weight:800}
.qk-devtools-json-tree__key::after{content:":";color:var(--qk-dim);margin-left:1px}
.qk-devtools-json-tree__value{position:relative;z-index:1;color:#cfd8dc}
.qk-devtools-json-tree__value--string{color:#b9f18d}
.qk-devtools-json-tree__value--number{color:var(--qk-yellow)}
.qk-devtools-json-tree__value--boolean{color:var(--qk-cyan)}
.qk-devtools-json-tree__value--null{color:var(--qk-purple)}
.qk-devtools-json-tree__meta{position:relative;z-index:1;color:#d7c88f}
.qk-devtools-json-tree__tag{position:relative;z-index:1;display:inline-flex;align-items:center;min-height:18px;border:1px solid #25533f;border-radius:999px;background:#0f241c;color:#9ff0c8;padding:0 7px;font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-json-tree__row[data-match="true"] .qk-devtools-json-tree__tag{border-color:#80671b;background:#231f10;color:#ffe08a}
.qk-devtools-card-grid{min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;overflow:auto}
.qk-devtools__section{min-width:0;border:1px solid var(--qk-line);border-radius:7px;background:rgba(13,17,20,.82);padding:12px}
.qk-devtools__section--wide{grid-column:1/-1}
.qk-devtools__section h3,.qk-devtools__section p{margin:0}
.qk-devtools__section h3{margin-bottom:10px;font-size:12px;font-weight:800;color:var(--qk-text)}
.qk-devtools__kv{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;align-items:start;padding:4px 0;color:var(--qk-muted)}
.qk-devtools__kv strong{color:#dce6e1;font-weight:800}
.qk-devtools__kv span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qk-devtools-empty{color:var(--qk-muted)}
.qk-devtools__log-scroll{min-height:0;flex:1;overflow:auto;border:1px solid var(--qk-line);border-radius:7px;background:#080c0f}
.qk-devtools-panel table{width:100%;min-width:720px;border-collapse:collapse}
.qk-devtools-panel th,.qk-devtools-panel td{text-align:left;border-bottom:1px solid var(--qk-line-soft);padding:8px 10px;white-space:nowrap}
.qk-devtools-panel th{position:sticky;top:0;background:#0d1216;color:var(--qk-muted);font-weight:800}
.qk-devtools-panel td{color:#dbe5e0}
.qk-devtools-interaction-row,.qk-devtools-timeline-row{cursor:pointer}
.qk-devtools-interaction-row:hover td,.qk-devtools-interaction-row[data-expanded="true"] td,.qk-devtools-timeline-row:hover td,.qk-devtools-timeline-row[data-expanded="true"] td{background:#0b1114}
.qk-devtools-row-toggle{display:inline-flex;align-items:center;gap:6px;font-weight:800}
.qk-devtools-row-toggle .qk-devtools-icon{width:14px;height:14px;color:var(--qk-green)}
.qk-devtools-interaction-detail td{padding:0 10px 10px 38px;background:#070b0d;white-space:normal}
.qk-devtools-log-group{display:grid;gap:8px;min-width:0}
.qk-devtools-log-group__entry{min-width:0;border:1px solid var(--qk-line-soft);border-radius:6px;background:#090e11;padding:8px}
.qk-devtools-log-group__entry[data-kind="operation"]{border-left:2px solid var(--qk-yellow)}
.qk-devtools-log-group__entry[data-kind="render"]{border-left:2px solid var(--qk-cyan)}
.qk-devtools-log-group__head{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;align-items:center;gap:8px;margin-bottom:8px;font:750 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-log-group__head span{color:var(--qk-dim)}
.qk-devtools-log-group__head strong{color:#e7f0eb;text-transform:uppercase}
.qk-devtools-log-group__head em{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9fb8ad;font-style:normal}
.qk-devtools-log-group__head small{color:var(--qk-muted);font:inherit}
.qk-devtools-log-group__detail{min-width:0}
.qk-devtools-log-group .qk-devtools-entry-detail__item strong{white-space:normal;overflow-wrap:anywhere}
.qk-devtools-log-group__empty{border:1px dashed var(--qk-line);border-radius:6px;padding:10px;color:var(--qk-muted)}
.qk-devtools-entry-detail td{padding:0 10px 10px 46px;background:#090d10;color:var(--qk-muted);white-space:normal}
.qk-devtools-entry-detail__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.qk-devtools-entry-detail__item{min-width:0;border:1px solid var(--qk-line-soft);border-radius:6px;background:#0b1013;padding:7px 8px}
.qk-devtools-entry-detail__item span{display:block;margin-bottom:4px;color:var(--qk-dim);font:750 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase}
.qk-devtools-entry-detail__item strong{display:block;overflow:hidden;text-overflow:ellipsis;color:#cbd8d2;font:700 11px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.qk-devtools-panel tr[data-slow="true"] td:last-child,.qk-devtools-panel tr[data-settled="false"] td:nth-child(6){color:var(--qk-red);font-weight:800}
@media (max-width:920px){.qk-devtools-export-bar button span{display:none}.qk-devtools-brand{min-width:148px}.qk-devtools-status span{display:none}}
@media (max-width:760px){.qk-devtools-shell{padding:0 8px 8px}.qk-devtools-panel{width:calc(100vw - 16px);height:min(620px,72vh)}.qk-devtools-layout{grid-template-columns:1fr}.qk-devtools-rail{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-right:0;border-bottom:1px solid var(--qk-line)}.qk-devtools-rail button{display:flex;justify-content:center;text-align:center;padding:0 4px}.qk-devtools-rail button span,.qk-devtools-rail small{display:none}.qk-devtools-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.qk-devtools-card-grid{grid-template-columns:1fr}.qk-devtools-json-toolbar{grid-template-columns:1fr}.qk-devtools-entry-detail__grid{grid-template-columns:1fr}.qk-devtools-launcher{right:var(--qk-devtools-launcher-inline-end,12px);bottom:var(--qk-devtools-launcher-block-end,12px)}.qk-devtools-brand span,.qk-devtools-status{display:none}.qk-devtools-topbar{gap:8px;padding-left:10px}.qk-devtools-export-count span{display:none}}
</style>`;
}
