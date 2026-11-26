/** 文档处理过程的前端日志（方案 3）。
 *
 *  服务端只给 `status` / `graph_status` / `chunk_count` / `size_bytes` /
 *  `extracted_chunks` / `graph_started_at`，SSE 刷新列表后若快照变了就记一条
 *  带时间戳的行。细日志活在本会话（sessionStorage 扛刷新）；步骤条可从当前
 *  状态随时重画。`graph_started_at` 用来续算「已用时长」，避免刷新从 0 起跳。 */
import { useEffect, useState } from "react";
import type { Doc } from "./api";

export const PROCESS_STEPS = [
  "pending",
  "parsing",
  "indexing",
  "embedding",
  "ready",
  "extracting",
  "done",
] as const;

export type ProcessStep = (typeof PROCESS_STEPS)[number];

export type ProcessSnap = {
  filename: string;
  status: string;
  graph_status: string;
  chunk_count: number;
  /** 已抽取分块数；缺省按 0 */
  extracted_chunks: number;
  size_bytes: number;
  error: string | null;
  graph_error: string | null;
  /** 本轮抽取开始；ISO 字符串或 null */
  graph_started_at: string | null;
};

export type ProcessLogLine = {
  at: number;
  step: ProcessStep;
  status: string;
  graph_status: string;
  chunk_count: number;
  extracted_chunks: number;
  size_bytes: number;
};

export type ProcessTrack = {
  id: string;
  firstAt: number;
  /** 整条管道走完（或跳过抽取）的时刻；失败不写 */
  completedAt: number | null;
  snap: ProcessSnap;
  lines: ProcessLogLine[];
};

export type ProcessSummary = {
  working: number;
  queued: number;
  failed: number;
};

/** 完成后在活动面板里再留一会儿，好让人看见「完成」 */
export const COMPLETED_HOLD_MS = 12_000;
const MAX_LINES = 40;
const STORAGE_KEY = "utopia-process-log-v1";

const INGEST_INDEX: Record<string, number> = {
  pending: 0,
  parsing: 1,
  indexing: 2,
  embedding: 3,
  ready: 4,
};

export function isBusy(status: string, graphStatus: string): boolean {
  if (["pending", "parsing", "indexing", "embedding"].includes(status)) return true;
  return (
    graphStatus === "queued" ||
    graphStatus === "extracting" ||
    graphStatus === "paused"
  );
}

/** 图谱抽取进行中或已暂停——行内可显示暂停/继续/停止 */
export function canControlExtraction(graphStatus: string): boolean {
  return (
    graphStatus === "queued" ||
    graphStatus === "extracting" ||
    graphStatus === "paused"
  );
}

export function isFailed(status: string, graphStatus: string): boolean {
  return status === "failed" || graphStatus === "failed";
}

export function isQueued(status: string, graphStatus: string): boolean {
  return status === "pending" || graphStatus === "queued";
}

export function isWorking(status: string, graphStatus: string): boolean {
  if (["parsing", "indexing", "embedding"].includes(status)) return true;
  return graphStatus === "extracting";
}

/** 当前走到哪一步。失败时停在出事的那一格；跳过抽取算完成。 */
export function stepOf(
  status: string,
  graphStatus: string,
): { step: ProcessStep; index: number; failed: boolean; skipped: boolean } {
  if (status === "failed") {
    // 摄入失败：不知道卡在哪一格，停在第一步并标失败
    return { step: "pending", index: 0, failed: true, skipped: false };
  }
  const ingest = INGEST_INDEX[status];
  if (ingest === undefined) {
    return { step: "pending", index: 0, failed: false, skipped: false };
  }
  if (ingest < 4) {
    return {
      step: PROCESS_STEPS[ingest]!,
      index: ingest,
      failed: false,
      skipped: false,
    };
  }
  // 摄入已就绪 → 图谱侧
  if (graphStatus === "failed") {
    return { step: "extracting", index: 5, failed: true, skipped: false };
  }
  if (graphStatus === "skipped") {
    return { step: "done", index: 6, failed: false, skipped: true };
  }
  if (graphStatus === "done") {
    return { step: "done", index: 6, failed: false, skipped: false };
  }
  if (
    graphStatus === "queued" ||
    graphStatus === "extracting" ||
    graphStatus === "paused"
  ) {
    return { step: "extracting", index: 5, failed: false, skipped: false };
  }
  // graph none：还在「就绪」，等抽取入队
  return { step: "ready", index: 4, failed: false, skipped: false };
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
}

export function summarize(tracks: ProcessTrack[]): ProcessSummary {
  let working = 0;
  let queued = 0;
  let failed = 0;
  for (const t of tracks) {
    const { status, graph_status } = t.snap;
    if (isFailed(status, graph_status)) failed += 1;
    else if (isWorking(status, graph_status)) working += 1;
    else if (isQueued(status, graph_status)) queued += 1;
    else if (isBusy(status, graph_status)) working += 1;
  }
  return { working, queued, failed };
}

function snapOf(doc: Doc): ProcessSnap {
  return {
    filename: doc.filename,
    status: doc.status,
    graph_status: doc.graph_status,
    chunk_count: doc.chunk_count,
    extracted_chunks: doc.extracted_chunks ?? 0,
    size_bytes: doc.size_bytes,
    error: doc.error,
    graph_error: doc.graph_error,
    graph_started_at: doc.graph_started_at ?? null,
  };
}

function snapChanged(a: ProcessSnap, b: ProcessSnap): boolean {
  return (
    a.status !== b.status ||
    a.graph_status !== b.graph_status ||
    a.chunk_count !== b.chunk_count ||
    a.extracted_chunks !== b.extracted_chunks
  );
}

/** 同一次抽取里块数只增不减，避免多个 documents 查询乱序回写把进度打回去。 */
function mergeExtracted(prev: ProcessSnap, snap: ProcessSnap): number {
  const reset =
    (snap.graph_status === "queued" &&
      !["queued", "extracting", "paused"].includes(prev.graph_status)) ||
    (snap.graph_status === "none" && prev.graph_status !== "none") ||
    (snap.status === "pending" && prev.status !== "pending");
  if (reset) return snap.extracted_chunks;
  return Math.max(prev.extracted_chunks, snap.extracted_chunks);
}

function lineOf(snap: ProcessSnap, at = Date.now()): ProcessLogLine {
  return {
    at,
    step: stepOf(snap.status, snap.graph_status).step,
    status: snap.status,
    graph_status: snap.graph_status,
    chunk_count: snap.chunk_count,
    extracted_chunks: snap.extracted_chunks,
    size_bytes: snap.size_bytes,
  };
}

/** 图谱侧进度文案；尚无分块时不显示 */
export function chunksProgressMeta(
  chunkCount: number,
  extractedChunks: number,
  graphStatus: string,
  label: (done: number, total: number) => string,
): string | undefined {
  if (chunkCount <= 0) return undefined;
  if (
    graphStatus === "queued" ||
    graphStatus === "extracting" ||
    graphStatus === "paused" ||
    graphStatus === "done" ||
    graphStatus === "failed"
  ) {
    return label(extractedChunks, chunkCount);
  }
  return undefined;
}

/** 管道开始时刻：服务端 graph_started_at、已有 firstAt、现在，取最早。 */
export function resolveFirstAt(
  graphStartedAt: string | null | undefined,
  prevFirstAt?: number,
  now = Date.now(),
): number {
  const candidates = [now];
  if (prevFirstAt != null) candidates.push(prevFirstAt);
  if (graphStartedAt) {
    const t = Date.parse(graphStartedAt);
    if (!Number.isNaN(t)) candidates.push(t);
  }
  return Math.min(...candidates);
}

function finished(snap: ProcessSnap): boolean {
  if (isFailed(snap.status, snap.graph_status)) return false;
  if (snap.status !== "ready") return false;
  return snap.graph_status === "done" || snap.graph_status === "skipped";
}

// —— 模块级存储（与 toast 同类：无 context；sessionStorage 扛刷新）——

function loadTracks(): Map<string, ProcessTrack> {
  if (typeof sessionStorage === "undefined") return new Map();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const arr = JSON.parse(raw) as ProcessTrack[];
    if (!Array.isArray(arr)) return new Map();
    const now = Date.now();
    const map = new Map<string, ProcessTrack>();
    for (const t of arr) {
      if (!t?.id || typeof t.firstAt !== "number") continue;
      if (t.completedAt !== null && now - t.completedAt >= COMPLETED_HOLD_MS) continue;
      map.set(t.id, t);
    }
    return map;
  } catch {
    return new Map();
  }
}

function persistTracks(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...tracks.values()]));
  } catch {
    /* quota / private mode */
  }
}

let tracks = loadTracks();
let listeners = new Set<() => void>();
let pruneTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  persistTracks();
  for (const l of listeners) l();
}

function schedulePrune() {
  if (pruneTimer !== null) return;
  pruneTimer = setTimeout(() => {
    pruneTimer = null;
    const now = Date.now();
    let changed = false;
    for (const [id, t] of tracks) {
      if (t.completedAt !== null && now - t.completedAt >= COMPLETED_HOLD_MS) {
        tracks.delete(id);
        changed = true;
      }
    }
    if (changed) emit();
    // 还有未到期的完成项就再约一次
    if ([...tracks.values()].some((t) => t.completedAt !== null)) schedulePrune();
  }, 1_000);
}

/** 看见一篇文档时调用：忙/失败才建档；已跟踪的在快照变化时追加日志。 */
export function observeDoc(doc: Doc): void {
  const incoming = snapOf(doc);
  const prev = tracks.get(doc.id);
  if (!prev) {
    if (!isBusy(incoming.status, incoming.graph_status) && !isFailed(incoming.status, incoming.graph_status)) {
      return;
    }
    const now = Date.now();
    const firstAt = resolveFirstAt(incoming.graph_started_at, undefined, now);
    tracks.set(doc.id, {
      id: doc.id,
      firstAt,
      completedAt: finished(incoming) ? now : null,
      snap: incoming,
      lines: [lineOf(incoming, now)],
    });
    emit();
    if (finished(incoming)) schedulePrune();
    return;
  }

  const snap: ProcessSnap = {
    ...incoming,
    filename: incoming.filename || prev.snap.filename,
    extracted_chunks: mergeExtracted(prev.snap, incoming),
  };
  const next: ProcessTrack = {
    ...prev,
    firstAt: resolveFirstAt(snap.graph_started_at, prev.firstAt),
    snap,
  };
  if (snapChanged(prev.snap, snap)) {
    next.lines = [...prev.lines, lineOf(snap)].slice(-MAX_LINES);
  }
  if (finished(snap) && prev.completedAt === null) {
    next.completedAt = Date.now();
    schedulePrune();
  } else if (!finished(snap)) {
    next.completedAt = null;
  }
  tracks.set(doc.id, next);
  if (
    snapChanged(prev.snap, snap) ||
    prev.snap.filename !== snap.filename ||
    next.firstAt !== prev.firstAt
  ) {
    emit();
  } else {
    persistTracks();
  }
}

export function observeDocs(docs: readonly Doc[]): void {
  for (const d of docs) observeDoc(d);
}

export function getTrack(id: string): ProcessTrack | undefined {
  return tracks.get(id);
}

/** 活动面板要画的：进行中、失败、以及刚完成还没撤下的。 */
export function listPanelTracks(now = Date.now()): ProcessTrack[] {
  const out: ProcessTrack[] = [];
  for (const t of tracks.values()) {
    const { status, graph_status } = t.snap;
    if (isBusy(status, graph_status) || isFailed(status, graph_status)) {
      out.push(t);
      continue;
    }
    if (t.completedAt !== null && now - t.completedAt < COMPLETED_HOLD_MS) {
      out.push(t);
    }
  }
  out.sort((a, b) => b.firstAt - a.firstAt);
  return out;
}

export function dismissTrack(id: string): void {
  if (!tracks.has(id)) return;
  tracks.delete(id);
  emit();
}

export function subscribeProcessLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** 测试用：清空模块状态 */
export function resetProcessLog(): void {
  tracks = new Map();
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  if (pruneTimer !== null) {
    clearTimeout(pruneTimer);
    pruneTimer = null;
  }
  emit();
}

export function useProcessLog(): ProcessTrack[] {
  const [list, setList] = useState(() => listPanelTracks());
  useEffect(() => {
    const sync = () => setList(listPanelTracks());
    sync();
    return subscribeProcessLog(sync);
  }, []);
  // 完成项到期要自己掉下去：有完成项时每秒扫一次
  useEffect(() => {
    if (!list.some((t) => t.completedAt !== null)) return;
    const id = setInterval(() => setList(listPanelTracks()), 1_000);
    return () => clearInterval(id);
  }, [list]);
  return list;
}

export function useProcessTrack(docId: string | undefined): ProcessTrack | undefined {
  const [track, setTrack] = useState(() => (docId ? getTrack(docId) : undefined));
  useEffect(() => {
    if (!docId) {
      setTrack(undefined);
      return;
    }
    const sync = () => setTrack(getTrack(docId));
    sync();
    return subscribeProcessLog(sync);
  }, [docId]);
  return track;
}
