/** 通用组件实验室：未挂导航，路径 `/dev/Design`。
 *
 *  在这里用 shadcn 卡片把候选组件摆开，定稿后再接到正式页面。
 *  每个组件有稳定数字代号（D01…），页顶索引可跳转。 */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ProcessStepper,
  durationsFromEnteredAt,
  type StepperItem,
  type StepperState,
} from "@/components/ProcessStepper";
import { ProcessRowProgress } from "@/components/ProcessRowProgress";
import { PROCESS_STEPS } from "@/processLog";
import { S } from "@/i18n";
import { toast } from "@/toast";
import { PageHeader } from "@/ui";

const LABELS = S.library.process.steps;

/** 实验室目录：代号稳定，新增组件只往后加号，不改已有编号 */
const CATALOG = [
  { code: "D01", name: "ProcessStepper", hint: "详情页横向进度 · 含每步时长" },
  { code: "D02", name: "ProcessRowProgress", hint: "文库表格行内紧凑进度 · 含暂停/停止" },
  { code: "D99", name: "接入说明", hint: "定稿后如何接到正式页面" },
] as const;

type Scenario = {
  code: string;
  id: string;
  name: string;
  hint: string;
  offsets: (number | null)[];
  current: number;
  failed?: boolean;
  nowOffset: number;
  file?: string;
  meta?: string;
  size?: string;
  chunks?: string;
};

const SCENARIOS: Scenario[] = [
  {
    code: "D01.1",
    id: "extracting",
    name: "抽取中（与现网一致）",
    hint: "摄入五步已完成，图谱抽取进行中 — 对应文档详情 6/7",
    offsets: [0, 2_100, 9_100, 13_300, 25_000, 28_400, null],
    current: 5,
    nowOffset: 41_000,
  },
  {
    code: "D01.2",
    id: "done",
    name: "全部完成",
    hint: "七步都走过，时长为各步停留时间",
    offsets: [0, 1_800, 6_200, 10_000, 22_500, 24_000, 58_000],
    current: 6,
    nowOffset: 58_000,
  },
  {
    code: "D01.3",
    id: "failed",
    name: "向量化失败",
    hint: "失败步标红，时长停在出事那一格",
    offsets: [0, 2_000, 5_500, 8_000, null, null, null],
    current: 3,
    failed: true,
    nowOffset: 19_000,
  },
  {
    code: "D01.4",
    id: "early",
    name: "刚开始解析",
    hint: "后续步骤显示 —，当前步时长在走",
    offsets: [0, 800, null, null, null, null, null],
    current: 1,
    nowOffset: 4_200,
  },
];

function buildSteps(s: Scenario): StepperItem[] {
  const t0 = 1_700_000_000_000;
  const entered = s.offsets.map((o) => (o === null ? null : t0 + o));
  const durations = durationsFromEnteredAt(entered, t0 + s.nowOffset);
  return PROCESS_STEPS.map((key, i) => {
    let state: StepperState = "wait";
    if (s.failed && i === s.current) state = "failed";
    else if (i < s.current) state = "done";
    else if (i === s.current) state = s.current === 6 && !s.failed ? "done" : "current";
    return {
      key,
      label: LABELS[key],
      state,
      durationMs: durations[i] ?? null,
    };
  });
}

function CodeBadge({ code }: { code: string }) {
  return (
    <Badge variant="outline" className="u-num shrink-0 font-mono">
      {code}
    </Badge>
  );
}

/** D02.4 定稿样式：表格行内 + 暂停/停止（可点预览） */
function RowProgressCanonical() {
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const busy: Scenario = {
    code: "D02.4",
    id: "row-canonical",
    name: "行内定稿",
    hint: "",
    file: "医疗机构管理条例.md",
    meta: S.library.process.chunksProgress(8, 20),
    size: "12 KB",
    chunks: "20",
    offsets: [0, 1_000, 3_000, 5_000, 8_000, 12_000, null],
    current: 5,
    nowOffset: 712_000,
  };
  const idleFile = "护士条例.md";
  const steps = buildSteps(busy);

  return (
    <div id="D02.4" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CodeBadge code="D02.4" />
        <span className="text-title text-ink">行内定稿 · 含暂停/停止</span>
        <Badge variant="secondary">采用</Badge>
      </div>
      <p className="text-small text-ink-2">
        忙碌行：小点进度 + 徽标 + 块数 + 耗时 + 暂停/停止。空闲行：仍写「就绪 · 完成」，不挂控件。
      </p>
      <div className="overflow-hidden rounded-panel border border-line">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文件</TableHead>
              <TableHead>进度</TableHead>
              <TableHead className="text-right">文本块</TableHead>
              <TableHead className="text-right">大小</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="max-w-48 truncate font-medium">{busy.file}</TableCell>
              <TableCell className="min-w-80">
                {stopped ? (
                  <span className="text-small text-ink-2">已停止 · 可重新抽取</span>
                ) : (
                  <ProcessRowProgress
                    steps={steps}
                    meta={busy.meta}
                    elapsedMs={busy.nowOffset}
                    paused={paused}
                    onPause={() => {
                      setPaused(true);
                      toast.info("预览：已暂停");
                    }}
                    onResume={() => {
                      setPaused(false);
                      toast.info("预览：已继续");
                    }}
                    onStop={() => {
                      setStopped(true);
                      setPaused(false);
                      toast.info("预览：已停止");
                    }}
                  />
                )}
              </TableCell>
              <TableCell className="u-num text-right text-ink-2">{busy.chunks}</TableCell>
              <TableCell className="u-num text-right text-ink-2">{busy.size}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="max-w-48 truncate font-medium">{idleFile}</TableCell>
              <TableCell>
                <span className="text-small text-ink-2">就绪 · 完成</span>
              </TableCell>
              <TableCell className="u-num text-right text-ink-2">12</TableCell>
              <TableCell className="u-num text-right text-ink-2">8 KB</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ComponentLab() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-6 px-8 py-6">
      <PageHeader
        title="组件实验室"
        sub="候选通用组件先在这里用 shadcn 摆开，确认后再接到正式页面。本页不挂导航。沟通时直接说代号，例如「定稿 D02.4」。"
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>目录</CardTitle>
          <CardDescription>点击代号跳到对应组件</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {CATALOG.map((c) => (
              <li key={c.code}>
                <a
                  href={`#${c.code}`}
                  className="u-inline-link flex flex-wrap items-baseline gap-2 text-body"
                >
                  <span className="u-num font-mono text-ink">{c.code}</span>
                  <span className="text-ink">{c.name}</span>
                  <span className="text-small text-ink-2">{c.hint}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href="#D02.4"
                className="u-inline-link flex flex-wrap items-baseline gap-2 text-body"
              >
                <span className="u-num font-mono text-ink">D02.4</span>
                <span className="text-ink">行内定稿 · 暂停/停止</span>
                <span className="text-small text-ink-2">采用样式，可点预览</span>
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card id="D02">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CodeBadge code="D02" />
            <CardTitle>ProcessRowProgress</CardTitle>
            <Badge variant="outline">已接入</Badge>
          </div>
          <CardDescription>
            塞进文库表格行。请以 <span className="font-mono">D02.4</span>{" "}
            为准：空闲行纯文字，忙碌行带暂停/停止。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-6">
          <RowProgressCanonical />
        </CardContent>
      </Card>

      <Card id="D01">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CodeBadge code="D01" />
            <CardTitle>ProcessStepper</CardTitle>
            <Badge variant="outline">已接入</Badge>
          </div>
          <CardDescription>
            详情页横向进度 · 每步时长。文库浮层拟改为 D02.4 行内后收掉。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8 pt-6">
          {SCENARIOS.map((s, i) => (
            <div key={s.id} id={s.code} className="flex flex-col gap-4">
              {i > 0 && <Separator />}
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CodeBadge code={s.code} />
                  <span className="text-title text-ink">{s.name}</span>
                  {s.failed ? (
                    <Badge variant="destructive">失败</Badge>
                  ) : s.current === 6 ? (
                    <Badge variant="outline">完成</Badge>
                  ) : (
                    <Badge variant="secondary">进行中</Badge>
                  )}
                </div>
                <p className="text-small text-ink-2">{s.hint}</p>
              </div>
              <ProcessStepper
                title={S.doc.process.title}
                progressLabel={`${Math.min(s.current + 1, 7)}/7`}
                steps={buildSteps(s)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card id="D99" size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CodeBadge code="D99" />
            <CardTitle>接入说明</CardTitle>
          </div>
          <CardDescription>
            已接入文库：忙碌行用 D02.4（含暂停/继续/停止），空闲行仍是状态列；右下角
            `ProcessActivity` 已收掉。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-fine text-ink-2">/dev/Design#D02.4</p>
        </CardContent>
      </Card>
    </div>
  );
}
