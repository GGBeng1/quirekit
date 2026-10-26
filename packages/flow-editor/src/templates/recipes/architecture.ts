import { buildRecipe } from "./build";

/** @returns An application dependency diagram without claiming nested containers. */
export function applicationRecipe() { return buildRecipe([
  ["client", "display", 260, 0, "Web / 移动端", "purple"], ["gateway", "subprocess", 260, 140, "API 网关"],
  ["auth", "process", 0, 300, "身份服务"], ["business", "process", 260, 300, "业务服务"], ["jobs", "process", 520, 300, "任务服务"],
  ["database", "database", 130, 460, "主数据库", "green"], ["cache", "stored-data", 460, 478, "缓存 / 队列", "orange"],
], [["client", "gateway"], ["gateway", "auth"], ["gateway", "business"], ["gateway", "jobs"], ["auth", "database"], ["business", "database"], ["business", "cache"], ["jobs", "cache"]]); }

/** @returns Order service dependencies with synchronous and event paths. */
export function servicesRecipe() { return buildRecipe([
  ["user", "ellipse", 0, 150, "用户请求", "purple"], ["order", "subprocess", 260, 150, "订单服务"],
  ["inventory", "process", 560, 0, "库存服务"], ["payment", "process", 560, 150, "支付服务"],
  ["event", "stored-data", 560, 300, "事件队列", "orange"], ["notice", "process", 860, 300, "通知服务", "green"],
  ["db", "database", 260, 340, "订单数据库", "green"],
], [["user", "order", "", "right", "left"], ["order", "inventory", "预留", "right", "left"], ["order", "payment", "扣款", "right", "left"], ["order", "event", "发布事件", "right", "left"], ["event", "notice", "消费", "right", "left"], ["order", "db"]]); }
