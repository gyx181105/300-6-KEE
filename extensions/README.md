# extensions/ — 内容包（KEE 薄层）

> 归属：本地扩展，非 utopia Core  
> 状态：示例包已放好；装包方式跟上游本体导入（OWL / 工作台），不以分叉 Core 为准  
> 上位：[项目文档/2-跟进-utopia.md](../项目文档/2-跟进-utopia.md)

## 规则

1. 领域差异用**内容包**表达，不改上游 Core。  
2. 示例在 `examples/`；契约在 `contracts/`。  
3. 默认不在 Core 进程执行包内任意代码。

## 目录

| 路径 | 用途 |
|---|---|
| [contracts/](./contracts/) | OntologyPack manifest schema |
| [examples/](./examples/) | 示例 / 领域演示内容包 |
