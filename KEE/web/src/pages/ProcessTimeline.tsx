/** 文档详情页的处理时间线：D01 横向步进器 + 本会话日志。 */
import { useEffect, useState } from "react";
import {
  PROCESS_STEPS,
  chunksProgressMeta,
  formatSize,
  isBusy,
  isFailed,
  resolveFirstAt,
  stepOf,
  useProcessTrack,
  type ProcessTrack,
} from "../processLog";
import type { Doc } from "../api";
import { S } from "../i18n";
import { buildProcessStepperItems, ProcessStepper } from "../components/ProcessStepper";
import { lineText } from "./ProcessActivity";

export function ProcessTimeline({ doc }: { doc: Doc }) {
  const track = useProcessTrack(doc.id);
  const pos = stepOf(doc.status, doc.graph_status);
  const busy = isBusy(doc.status, doc.graph_status);
  const failed = isFailed(doc.status, doc.graph_status);
  const complete =
    doc.status === "ready" &&
    (doc.graph_status === "done" || doc.graph_status === "skipped");
  const lines = track?.lines ?? [];
  const now = useTickingNow(busy && !failed);

  // 已完成且本会话没有日志：不占地方
  if (complete && !failed && lines.length === 0) return null;

  const firstAt = resolveFirstAt(doc.graph_started_at, track?.firstAt, now);
  const steps = buildProcessStepperItems({
    status: doc.status,
    graphStatus: doc.graph_status,
    labels: S.library.process.steps,
    skippedLabel: S.library.graphStatus.skipped,
    lines,
    firstAt,
    completedAt: track?.completedAt,
    now,
  });
  const extracted = doc.extracted_chunks ?? track?.snap.extracted_chunks ?? 0;
  const meta = chunksProgressMeta(
    doc.chunk_count,
    extracted,
    doc.graph_status,
    S.library.process.chunksProgress,
  );

  return (
    <section className="mb-6">
      <ProcessStepper
        title={S.doc.process.title}
        progressLabel={`${pos.index + 1}/${PROCESS_STEPS.length}`}
        meta={meta}
        steps={steps}
      />

      {failed && (doc.error || doc.graph_error) && (
        <p className="mt-3 whitespace-pre-wrap text-small text-danger">
          {doc.error || doc.graph_error}
        </p>
      )}

      {lines.length > 0 && (
        <div className="mt-4 rounded-panel border border-line bg-surface p-3">
          <div className="mb-2 text-fine text-ink-2">{S.doc.process.log}</div>
          <ul className="max-h-48 space-y-1 overflow-y-auto u-scroll">
            {lines.map((line) => (
              <li
                key={`${line.at}-${line.status}-${line.graph_status}-${line.chunk_count}`}
                className="text-small text-ink-2"
              >
                <span className="u-num mr-2">{clock(line.at)}</span>
                {lineText(line)}
                {line.chunk_count > 0 && line.step !== "indexing" && (
                  <span className="u-num"> · {formatSize(line.size_bytes)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!lines.length && trackHint(doc, track)}
    </section>
  );
}

function trackHint(doc: Doc, track: ProcessTrack | undefined) {
  if (track || (!isBusy(doc.status, doc.graph_status) && !isFailed(doc.status, doc.graph_status))) {
    return null;
  }
  return (
    <p className="mt-3 text-small text-ink-2">{S.doc.process.liveHint}</p>
  );
}

function clock(at: number): string {
  const d = new Date(at);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

/** 进行中时每秒刷新，好让当前步时长往上走 */
function useTickingNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [active]);
  return active ? now : Date.now();
}
