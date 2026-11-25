# ADR-014 — 内容包与扩展

> 状态：草案（对齐 ADR-010）  
> 详设可后续补；实现以 `extensions/` + Core 装包 API 为准。

## 决策

1. **L1 本体包 / L2 能力包**：声明式制品；Core 负责校验、预览、安装、审计。  
2. **L3 运行插件**（连接器、专用模型）：默认同进程外、受控调用；禁止包内任意代码在 Core 执行。  
3. 示例包放 `extensions/examples/`；契约放 `extensions/contracts/`。  
4. 不为行业再建应用层 Adapter 产品。

## 现状（摘要）

已有内嵌/扩展 OntologyPack preview·apply；动态插件沙箱与签名市场**未**宣称已实现。
