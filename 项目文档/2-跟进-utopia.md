# 跟进 Utopia（引擎真源）

> 状态：已切换（2026-11-26）  
> 工作分支：`follow-utopia`（跟踪 `upstream/main`）  
> 旧线备份：`archive/kee-pre-utopia`

## 决策

**Core 完全跟 [deeplethe/utopia](https://github.com/deeplethe/utopia)。**  
KEE 定位不冲突：对外仍可称 Knowledge Evolution Engine；实现上不再维护分叉 Core。

| 层 | 真源 |
|---|---|
| 引擎 / Web / 迁移 | `upstream` = utopia |
| 本地薄层 | `extensions/` 示例包、`项目文档/`、`项目文档/archive-kee/` 产品存档 |
| 旧 KEE 分叉 | 仅 `archive/kee-pre-utopia`，不再作为开发基线 |

## Git

```bash
git remote -v
# upstream  → https://github.com/deeplethe/utopia.git
# origin    → 本仓库（vaelephant/300-6-KEE）

git checkout follow-utopia
git fetch upstream
git merge upstream/main   # 或 rebase；保持快进优先
```

日常开发在 `follow-utopia`；需要回看旧改动时：

```bash
git show archive/kee-pre-utopia:extensions/examples/demo-nephrology-ontology/manifest.json
```

## 本地保留了什么

- `extensions/` — OntologyPack 契约与示例（肾内演示等）；上游无此目录，属内容层
- `项目文档/`、`需求文档/` — 交付与运维说明
- `项目文档/archive-kee/` — 切换前产品 ADR / 路线图存档（**不是** 引擎设计真源；引擎设计看上游 `docs/design`）
- `项目文档/archive-kee/local-migrations/` — 旧线 `0081`/`0082` 仅存档，**勿再应用到 utopia schema**

## 数据注意

- 旧 `kee.dump` / 自定义迁移与上游 schema **不保证兼容**。生产/演示库建议：**新库跑 utopia 迁移**，需要的语料重新摄入或按上游版本升级指南处理。
- 本机 `data/` 若来自旧线，升级前先备份；schema 只前滚。

## 明确不再跟旧线做的事

- 不再改分叉版 `crates/` 去追功能；缺能力 → 跟上游或给 utopia 提 PR
- 不再恢复 `applications/medical` 行业后端
- 内容包差异用 `extensions/` 表达，不改 Core 硬编码行业字段
