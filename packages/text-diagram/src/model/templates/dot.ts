import type { TextDiagramTemplate } from "../../types";

/** @param locale - New template language. @returns Graphviz examples with explicit layout and grouping. */
export function dotTemplates(locale: string): readonly TextDiagramTemplate[] {
  const english = /^en(?:-|$)/iu.test(locale);
  /** @param zh - Chinese label. @param en - English label. @returns Localized source text. */
  const t = (zh: string, en: string): string => english ? en : zh;
  return [
    { id: "dot-graph", label: t("有向图", "Directed graph"), language: "dot", source: `digraph G {
  rankdir=LR;
  node [shape=box, style=rounded];
  A [label="${t("开始", "Start")}"];
  B [label="${t("审阅", "Review")}"];
  C [label="${t("发布", "Publish")}"];
  A -> B -> C;
}` },
    { id: "dot-undirected", label: t("无向关系图", "Undirected graph"), language: "dot", source: `graph G {
  node [shape=ellipse];
  Design [label="${t("设计", "Design")}"];
  Development [label="${t("开发", "Development")}"];
  Testing [label="${t("测试", "Testing")}"];
  Product [label="${t("产品", "Product")}"];
  Product -- Design;
  Product -- Development;
  Design -- Development;
  Development -- Testing;
  Testing -- Product;
}` },
    { id: "dot-clusters", label: t("分组架构图", "Clustered architecture"), language: "dot", source: `digraph G {
  rankdir=LR;
  node [shape=box, style=rounded];
  subgraph cluster_client {
    label="${t("客户端", "Client")}";
    Editor [label="${t("编辑器", "Editor")}"];
    Preview [label="${t("预览器", "Preview")}"];
  }
  subgraph cluster_server {
    label="${t("服务端", "Server")}";
    API [label="${t("文档 API", "Document API")}"];
    Storage [label="${t("存储", "Storage")}", shape=cylinder];
  }
  Editor -> API;
  Preview -> API;
  API -> Storage;
}` },
    { id: "dot-dependencies", label: t("依赖关系图", "Dependency graph"), language: "dot", source: `digraph G {
  rankdir=TB;
  node [shape=box, style=rounded];
  App [label="${t("应用", "Application")}"];
  Editor [label="${t("编辑器", "Editor")}"];
  Export [label="${t("导出模块", "Export")}"];
  Model [label="${t("文档模型", "Document model")}"];
  Shared [label="${t("公共工具", "Shared utilities")}"];
  App -> { Editor Export };
  Editor -> Model;
  Export -> Model;
  Model -> Shared;
}` },
  ];
}
