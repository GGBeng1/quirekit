import { flowEditorText } from "../locale/resolve";
import { orderClasses, serviceClasses } from "./structures/classes";
import { commerceEntities, membershipEntities } from "./structures/entities";
import { instantiateFlowchart, type FlowchartDocument } from "@quirekit/flowchart";
import type { FlowchartTemplate, FlowchartTemplateId } from "./types";
import { createLegacyTemplate } from "./legacy";
import { orderRecipe, leaveRecipe, expenseRecipe, incidentRecipe, releaseRecipe } from "./recipes/workflow";
import { cleaningRecipe, backupRecipe } from "./recipes/data";
import { applicationRecipe, servicesRecipe } from "./recipes/architecture";
import { timelineRecipe, improvementRecipe, teamRecipe } from "./recipes/planning";
import { organizationDiagram } from "./diagrams/organization";
import { fishboneDiagram } from "./diagrams/fishbone";
import { radialDiagram } from "./diagrams/radial";
import { cycleDiagram } from "./diagrams/cycle";
import { milestonesDiagram } from "./diagrams/milestones";
import { honeycombDiagram } from "./diagrams/honeycomb";
import { systemArchitectureTemplate } from "./structures/architecture";
import { sequenceTemplate, asyncSequenceTemplate } from "./structures/sequence";
import { swimlaneTemplate } from "./structures/swimlanes";

/** Original, editable built-in recipes. Blank is visible in every category. */
export const flowchartTemplates: readonly FlowchartTemplate[] = [
  { id: "blank", label: "空白流程图", description: "从空白画布开始，自由组合图形与连线。" },
  { id: "er-commerce", label: "订单数据模型", category: "er", description: "客户、订单、明细与商品的实体字段、PK/FK 和 1..N / 0..N 关系。" },
  { id: "er-membership", label: "团队成员 ER 图", category: "er", description: "通过成员实体表达用户与团队的多对多关系；字段可新增、删除和排序。" },
  { id: "uml-order", label: "订单领域类图", category: "uml", description: "名称、属性和方法三分区，展示客户、订单、明细、商品与关联、组合、依赖。" },
  { id: "uml-services", label: "通知服务类图", category: "uml", description: "接口、基类和实现类，展示泛化、实现和聚合；签名为可编辑文字。" },
  { id: "sequence", label: "用户登录时序图", category: "sequence", description: "参与者、生命线、激活条和请求/返回消息；选择两个参与者后可从结构菜单追加消息。" },
  { id: "sequence-async", label: "异步任务时序图", category: "sequence", description: "人物参与者、异步通知、循环片段、自调用与销毁标记，可分别修改条件和消息。" },
  { id: "system-architecture", label: "系统架构设计", category: "architecture", description: "访问、应用、数据和基础设施四层；拖动容器标题会带动其中的服务。" },
  { id: "swimlane-horizontal", label: "泳道流程图（横向）", category: "swimlane", description: "按申请、审批、执行分道；拖动节点跨道更新归属，整道移动保留成员。" },
  { id: "swimlane-vertical", label: "泳道流程图（纵向）", category: "swimlane", description: "纵向职责泳道与跨部门审批，可编辑标题、成员和跨道连线。" },
  { id: "organization", label: "组织结构图", category: "organization", description: "三级组织树，呈现部门、岗位与汇报关系；可手动调整布局。" },
  { id: "fishbone", label: "鱼骨分析图", category: "analysis", description: "沿主轴梳理六类原因和十二条子原因，定位交付延期的影响因素。" },
  { id: "radial", label: "放射关系图", category: "relationship", description: "中心主题、六个关系组和外圈对象，梳理产品生态与关联。" },
  { id: "cycle", label: "环形循环图", category: "planning", description: "六个阶段围绕中心目标循环，以可编辑弧线连接。" },
  { id: "milestones", label: "里程碑时间轴", category: "planning", description: "时间主轴与上下交替的六个事件；日期为自由文字，可手动调整。" },
  { id: "honeycomb", label: "六边形能力图", category: "relationship", description: "中心主题与六个相邻能力块，适合产品能力、团队职责和业务全景。" },
  { id: "approval", label: "内容发布流程", category: "workflow", description: "从编写、审核到发布，包含修改回路。" },
  { id: "order", label: "订单履约", category: "workflow", description: "支付、库存、发货与签收，兼顾重试和超时。" },
  { id: "leave", label: "请假审批", category: "workflow", description: "提交申请、主管审批、登记与补充说明。" },
  { id: "expense", label: "费用报销", category: "workflow", description: "整理票据、材料审核、付款与凭证归档。" },
  { id: "incident", label: "故障处置", category: "workflow", description: "告警分流、恢复服务、验证与复盘。" },
  { id: "release", label: "版本发布", category: "workflow", description: "构建测试、灰度验证及异常回滚。" },
  { id: "pipeline", label: "数据处理流程", category: "data", description: "采集、处理、分析与报告的线性流程。" },
  { id: "cleaning", label: "数据清洗", category: "data", description: "标准化、质量检查与异常记录隔离。" },
  { id: "backup", label: "备份恢复", category: "data", description: "备份存储、恢复演练与数据一致性校验。" },
  { id: "application", label: "应用架构", category: "architecture", description: "客户端、网关、服务、数据库与缓存的关系。" },
  { id: "services", label: "服务依赖", category: "architecture", description: "订单、库存、支付与事件通知的调用关系。" },
  { id: "timeline", label: "项目时间轴", category: "planning", description: "调研、设计、开发、发布四个可编辑里程碑。" },
  { id: "improvement", label: "持续改进", category: "planning", description: "计划、执行、检查、调整的 PDCA 循环。" },
  { id: "team", label: "团队协作", category: "relationship", description: "围绕共同目标明确产品、设计、研发与质量分工。" },
  { id: "sketch", label: "手绘 · 从灵感到落地", category: "workflow", description: "自然笔触与铅笔排线，梳理从想法到落地的过程。" },
];
const recipes = { "uml-order": orderClasses, "uml-services": serviceClasses, "er-commerce": commerceEntities, "er-membership": membershipEntities, order: orderRecipe, leave: leaveRecipe, expense: expenseRecipe, incident: incidentRecipe,
  release: releaseRecipe, cleaning: cleaningRecipe, backup: backupRecipe, application: applicationRecipe,
  services: servicesRecipe, timeline: timelineRecipe, improvement: improvementRecipe, team: teamRecipe,
  organization: organizationDiagram, fishbone: fishboneDiagram, radial: radialDiagram, cycle: cycleDiagram,
  milestones: milestonesDiagram, honeycomb: honeycombDiagram, "system-architecture": systemArchitectureTemplate,
  sequence: sequenceTemplate, "sequence-async": asyncSequenceTemplate, "swimlane-horizontal": () => swimlaneTemplate(false), "swimlane-vertical": () => swimlaneTemplate(true) };

/** @param id - Stable catalog identity. @param prefix - Unique instance prefix. @param locale - Language for newly created built-in content. @returns Validated editable source with fresh identities and internal references. */
export function createFlowchartTemplate(id: FlowchartTemplateId, prefix: string, locale = "zh-CN"): FlowchartDocument {
  const legacy = id === "blank" || id === "approval" || id === "pipeline" || id === "sketch";
  if (!legacy && !Object.hasOwn(recipes, id)) throw new TypeError("未知流程图模板");
  const source = legacy ? createLegacyTemplate(id, prefix) : instantiateFlowchart(recipes[id](), prefix);
  // Only fresh built-in content crosses this boundary; saved and user-authored text never does.
  return { ...source, nodes: source.nodes.map(node => ({ ...node, text: flowEditorText(locale, node.text) })),
    edges: source.edges.map(edge => ({ ...edge, label: flowEditorText(locale, edge.label) })) };
}

/** @param locale - Current interface language. @returns Localized catalog metadata with stable recipe identities. */
export function localizedFlowchartTemplates(locale: string): readonly FlowchartTemplate[] {
  return flowchartTemplates.map(item => ({ ...item, label: flowEditorText(locale, item.label), description: flowEditorText(locale, item.description) }));
}
