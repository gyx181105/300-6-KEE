# ADR-010 — 单一可进化知识库

> 状态：已确认（2026-11-26）  
> 产品摘要见 [PRODUCT.md](../PRODUCT.md)

## 决策

KEE 是**通用、可进化的知识库引擎**：用户创建任意知识库、上传资料、配置规则与本体；系统维护可追溯知识，并通过 API / MCP / 对话服务 **LLM 与 Agent**。

- 不做分行业应用程序或仓库级 `applications/`。  
- 领域差异 = 用户内容与内容包（`extensions/examples/` 等），不硬编码进 Core。  
- 唯一运行时：`crates/` + `web/`。

## 后果

新功能只提行业中立 Core 能力或声明式包；排见 [ROADMAP](../ROADMAP.md)。
