/** 文库表格行内进度（D02）：单行紧凑 + 暂停/停止。
 *
 *  定稿样式见 /dev/Design#D02.4。忙碌时显示七步小点与操作；空闲时由页面自己写「就绪 · 完成」。 */
import { Pause, Play, Square } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatElapsed } from "@/processLog";
import type { StepperItem } from "./ProcessStepper";

export function ProcessRowProgress({
  steps,
  /** 例如「已抽 8 / 20 块」 */
  meta,
  /** 整条管道已耗时；不传则显示当前步时长 */
  elapsedMs,
  /** 已暂停：徽标改文案，暂停键变成继续 */
  paused,
  onPause,
  onResume,
  onStop,
  pauseLabel = "暂停",
  resumeLabel = "继续",
  stopLabel = "停止",
  pausedLabel = "已暂停",
  className,
}: {
  steps: StepperItem[];
  meta?: string;
  elapsedMs?: number | null;
  paused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  pauseLabel?: string;
  resumeLabel?: string;
  stopLabel?: string;
  pausedLabel?: string;
  className?: string;
}) {
  const current = steps.find((s) => s.state === "current" || s.state === "failed");
  const failed = current?.state === "failed";
  const allDone = !current && steps.every((s) => s.state === "done");
  const label = paused
    ? pausedLabel
    : (current?.label ?? (allDone ? steps[steps.length - 1]?.label : undefined));
  const stepTime = current?.durationMs ?? null;
  const timeMs = elapsedMs ?? stepTime;
  const index = failed || current ? steps.findIndex((s) => s === current) + 1 : steps.length;
  const showActions = !allDone && !failed && (onPause || onResume || onStop);

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-wrap items-center gap-2",
        className,
      )}
    >
      <ol className="flex shrink-0 items-center gap-1" aria-hidden>
        {steps.map((step, i) => {
          const prev = steps[i - 1];
          return (
            <li key={step.key} className="flex items-center gap-1">
              {i > 0 && (
                <span
                  className={cn(
                    "h-px w-2",
                    prev?.state === "done" || prev?.state === "current"
                      ? "bg-ok"
                      : "bg-line",
                    prev?.state === "failed" && "bg-danger",
                  )}
                />
              )}
              <span
                title={
                  step.durationMs === null
                    ? step.label
                    : `${step.label} · ${formatElapsed(step.durationMs)}`
                }
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  step.state === "done" && "bg-ok",
                  step.state === "current" && !paused && "bg-warn animate-pulse",
                  step.state === "current" && paused && "bg-warn",
                  step.state === "failed" && "bg-danger",
                  step.state === "wait" && "bg-surface-3",
                )}
              />
            </li>
          );
        })}
      </ol>

      <Badge
        variant={
          failed ? "destructive" : paused ? "outline" : allDone ? "outline" : "secondary"
        }
        className="shrink-0"
      >
        <span className="u-num mr-1">
          {index}/{steps.length}
        </span>
        {label}
      </Badge>

      {meta && <span className="u-num truncate text-fine text-ink-2">{meta}</span>}

      {timeMs != null && (
        <span className="u-num shrink-0 text-fine text-ink-2">
          {formatElapsed(timeMs)}
        </span>
      )}

      {showActions && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {paused
            ? onResume && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onResume}
                  aria-label={resumeLabel}
                  title={resumeLabel}
                >
                  <Play data-icon="inline-start" />
                  {resumeLabel}
                </Button>
              )
            : onPause && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onPause}
                  aria-label={pauseLabel}
                  title={pauseLabel}
                >
                  <Pause data-icon="inline-start" />
                  {pauseLabel}
                </Button>
              )}
          {onStop && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onStop}
              aria-label={stopLabel}
              title={stopLabel}
            >
              <Square data-icon="inline-start" />
              {stopLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
