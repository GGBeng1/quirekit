import type { QuireJSONContent } from "@quirekit/core";
import type { BlockContentTemplate } from "../rich-content/types";
/** @param text - Plain paragraph. @returns Canonical text. */
const paragraph = (text: string): QuireJSONContent => ({type:"paragraph",content:[{type:"text",text}]});
/** @param text - Section label. @returns Canonical heading. */
const heading = (text: string): QuireJSONContent => ({type:"heading",attrs:{level:3},content:[{type:"text",text}]});
/** Small editable recipes; never screenshots or a second document mode. */
export const blockContentTemplates: readonly BlockContentTemplate[] = [
  {id:"meeting",name:"会议记录",description:"议题、讨论结论与行动事项",content:[
    heading("会议记录"),paragraph("会议主题与日期"),heading("讨论结论"),paragraph("记录决定及其依据。"),
    heading("行动事项"),{type:"bulletList",content:[{type:"listItem",content:[paragraph("事项 · 负责人 · 完成时间")]}]}
  ]},
  {id:"comparison",name:"方案对比",description:"并列比较两个方向",content:[heading("方案对比"),{type:"blockColumns",attrs:{widths:[50,50]},content:[
    {type:"blockColumn",content:[heading("方案 A"),paragraph("优势"),paragraph("成本与风险")]},
    {type:"blockColumn",content:[heading("方案 B"),paragraph("优势"),paragraph("成本与风险")]}
  ]},paragraph("选择与下一步：")]},
  {id:"brief",name:"项目简报",description:"目标、范围和验收标准",content:[heading("项目简报"),paragraph("用一句话说明要解决的问题。"),
    {type:"blockContainer",attrs:{kind:"info",title:"目标与范围"},content:[paragraph("目标："),paragraph("范围：")]},
    heading("验收标准"),paragraph("列出可以检查的完成条件。")]},
  {id:"retrospective",name:"复盘记录",description:"事实、发现与后续改进",content:[heading("复盘记录"),heading("发生了什么"),paragraph("记录事实与结果。"),heading("学到了什么"),paragraph("保留有效做法，找到原因。"),heading("接下来怎么做"),paragraph("改进事项、负责人和检查时间。")]}
];
