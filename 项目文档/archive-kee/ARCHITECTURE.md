# 架构与目录

> 上位：[PRODUCT](./PRODUCT.md)

## 运行时

```text
浏览器 / LLM 客户端
        │
        ▼
   web/  +  utopia-server（:1516）
        │
        ├── utopia-ingest / extract / search / reason / llm / store
        └── PostgreSQL（+ pgvector 等）
```

单一进程交付；无分行业应用服务。

## 仓库树

```text
crates/           # Core（Rust workspace）
web/              # 唯一产品前台
migrations/       # Core schema
extensions/
  contracts/      # 包 manifest 等
  examples/       # 示例内容包（可装、可卸）
packages/         # SDK / 契约占位
docs/             # 本目录：产品与设计真源
```

## 规则

1. 新能力进 Core 或声明式包，不新建行业应用目录。  
2. UI 只在 `web/`。  
3. 领域类/规则内容在包或租户配置，不写进 `utopia-core` 类型硬编码。

细节分域见 [design/](./design/)；文档如何变成图谱见 [pipeline.md](./pipeline.md)。
