/** 横向处理进度：步骤点 + 连接线 + 每步时长（D01，已接到文库 / 文档详情）。 */
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import {
  PROCESS_STEPS,
  formatElapsed,
  stepOf,
  type ProcessLogLine,
  type ProcessStep,
} from "@/processLog";

export type StepperState = "done" | "current" | "wait" | "failed";

export type StepperItem = {
  key: string;
  label: string;
  state: StepperState;
  /** 该步已花或已完成的时长；未开始为 null */
  durationMs: number | null;
};

export function ProcessStepper({
  steps,
  title,
  progressLabel,
  /** 例如「已抽 12 / 316 块」 */
  meta,
  className,
}: {
  steps: StepperItem[];
  title?: string;
  progressLabel?: string;
  meta?: string;
  className?: string;
}) {
  const tone = steps.some((s) => s.state === "failed")
    ? "destructive"
    : steps.some((s) => s.state === "current")
      ? "secondary"
      : "outline";

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      {(title || progressLabel || meta) && (
        <div className="flex flex-wrap items-center gap-2">
          {title && <span className="text-body font-medium text-ink">{title}</span>}
          {progressLabel && (
            <Badge variant={tone} className="u-num">
              {progressLabel}
            </Badge>
          )}
          {meta && <span className="u-num text-fine text-ink-2">{meta}</span>}
        </div>
      )}

      <ol className="flex w-full min-w-0 items-start overflow-x-auto u-scroll pb-1">
        {steps.map((step, i) => {
          const prev = steps[i - 1];
          const lineDone =
            prev !== undefined &&
            (prev.state === "done" ||
              (prev.state === "current" && step.state !== "wait"));
          return (
            <li
              key={step.key}
              className={cn(
                "relative flex min-w-16 flex-1 flex-col items-center gap-2",
                i === 0 && "pl-0",
              )}
            >
              {/* 连接线：落在相邻两点之间 */}
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-2 right-1/2 left-[-50%] h-px",
                    lineDone ? "bg-ok" : "bg-line",
                    prev?.state === "failed" && "bg-danger",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 size-4 shrink-0 rounded-full ring-2 ring-background",
                  step.state === "done" && "bg-ok",
                  step.state === "current" &&
                    "bg-warn animate-pulse ring-warn/30",
                  step.state === "failed" && "bg-danger",
                  step.state === "wait" && "bg-surface-3",
                )}
                aria-current={step.state === "current" ? "step" : undefined}
              />
              <div className="flex flex-col items-center gap-1 px-1 text-center">
                <span
                  className={cn(
                    "text-fine",
                    step.state === "wait" ? "text-ink-2" : "text-ink",
                    step.state === "failed" && "text-danger",
                  )}
                >
                  {step.label}
                </span>
                <span className="u-num text-fine text-ink-2">
                  {step.durationMs === null ? "—" : formatElapsed(step.durationMs)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** 从各步进入时刻推每步时长。`enteredAt[i]` 为该步开始的 ms；未到过为 null。 */
export function durationsFromEnteredAt(
  enteredAt: readonly (number | null)[],
  now = Date.now(),
): (number | null)[] {
  return enteredAt.map((start, i) => {
    if (start === null) return null;
    const next = enteredAt.slice(i + 1).find((t) => t !== null) ?? null;
    const end = next ?? now;
    return Math.max(0, end - start);
  });
}

/** 本会话日志里各步首次出现的时刻；没见过的步为 null。 */
export function enteredAtFromLines(
  lines: readonly ProcessLogLine[],
  firstAt?: number,
  completedAt?: number | null,
): (number | null)[] {
  const entered: (number | null)[] = PROCESS_STEPS.map(() => null);
  for (const line of lines) {
    const i = PROCESS_STEPS.indexOf(line.step);
    if (i >= 0 && entered[i] === null) entered[i] = line.at;
  }
  if (firstAt !== undefined && entered[0] === null) entered[0] = firstAt;
  if (completedAt != null && entered[6] === null) entered[6] = completedAt;
  return entered;
}

export function stepperStateAt(
  i: number,
  current: number,
  failed: boolean,
  allDone: boolean,
): StepperState {
  if (failed && i === current) return "failed";
  if (allDone && !failed) return i <= current ? "done" : "wait";
  if (i < current) return "done";
  if (i === current) return "current";
  return "wait";
}

/** 从文档状态 + 可选会话轨迹生成 D01 步骤列表。 */
export function buildProcessStepperItems(opts: {
  status: string;
  graphStatus: string;
  labels: Record<ProcessStep, string>;
  skippedLabel?: string;
  lines?: readonly ProcessLogLine[];
  firstAt?: number;
  completedAt?: number | null;
  now?: number;
}): StepperItem[] {
  const pos = stepOf(opts.status, opts.graphStatus);
  const allDone = pos.step === "done" && !pos.failed;
  const entered = enteredAtFromLines(
    opts.lines ?? [],
    opts.firstAt,
    opts.completedAt,
  );
  const now = opts.now ?? opts.completedAt ?? Date.now();
  const durations = durationsFromEnteredAt(entered, now);
  return PROCESS_STEPS.map((key, i) => ({
    key,
    label:
      key === "done" && pos.skipped && opts.skippedLabel
        ? `${opts.labels[key]} · ${opts.skippedLabel}`
        : opts.labels[key],
    state: stepperStateAt(i, pos.index, pos.failed, allDone),
    durationMs: durations[i] ?? null,
  }));
}
