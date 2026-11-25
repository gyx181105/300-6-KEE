# 路线图（简化）

> 上位：[PRODUCT](./PRODUCT.md)  
> 完成记录：[开发完成日志](./开发完成日志.md)

## 当前主线

服务「用户自建 KB → 进化知识 → LLM 可用」闭环。**最近一刀**：打磨新手路径（建库 → 上传 → 对话/MCP），组织模型见 [PRODUCT](./PRODUCT.md)#组织模型。

其后按通用能力排：

1. **来源与原件** — 上传/连接器、版本、通用来源策略  
2. **解析与证据定位** — 分块、anchor、可回原件  
3. **抽取与本体** — 开放抽取、类型消解、包安装（A7）  
4. **治理** — 审核队列、冲突、发布/撤回  
5. **对 LLM 的服务面** — 检索 / RAG / 图谱 / MCP / 对话工具  

## 明确不做（产品层）

- 分行业应用程序或 `applications/` 树  
- Medical/Legal 独立后端  
- 把单一行业字段写死进 Core  
- **文件夹多级嵌套**（无强需求前不加 `parent_id`）  

## 近期已落地（2026-11-26）

- `demo-nephrology-ontology` 纳入 `extension_packs` 允许列表  
- Core 组织级 `citation_sources` + `/api/v1/me/citation-sources*`；账户页接回  
- 删除 `web` medicalApi / `/medical-api` 依赖  
- 定稿：多 KB + 并列文件夹；建库落地文库；对话空状态走完整 readiness 下一步  

旧「A→B 行业应用」排期已废止。
