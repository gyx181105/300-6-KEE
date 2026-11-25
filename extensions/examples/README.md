# extensions/examples — 示例内容包

> 归属：通用平台（内容扩展）  
> 状态：现行示例落点（ADR-010）

## 规则

1. 只放**声明式内容包**（本体/术语等），不放行业应用代码。  
2. 可含任意领域演示；不硬编码进 Core crates。  
3. 安装走 `extensions/contracts` + Core `ontology/packs/{id}/preview|apply`（以现网为准）。

## 本目录

| 包 | 说明 |
|---|---|
| [demo-ontology/](./demo-ontology/) | 图书馆目录 TTL（中立演示） |
| [demo-nephrology-ontology/](./demo-nephrology-ontology/) | 肾病合成演示（自原 medical packs 迁入） |
