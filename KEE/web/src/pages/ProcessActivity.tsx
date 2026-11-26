/** 处理日志行文案（详情时间线复用）。原右下角活动面板已改由文库行内 D02 承接。 */
import { S } from "../i18n";
import { formatSize, type ProcessLogLine } from "../processLog";

export function lineText(line: ProcessLogLine): string {
  const L = S.library.process;
  switch (line.step) {
    case "pending":
      return L.logPending;
    case "parsing":
      return L.logParsing(formatSize(line.size_bytes));
    case "indexing":
      return line.chunk_count > 0 ? L.logIndexed(line.chunk_count) : L.logIndexing;
    case "embedding":
      return L.logEmbedding;
    case "ready":
      return L.logReady;
    case "extracting":
      return line.graph_status === "queued"
        ? L.logGraphQueued
        : line.graph_status === "paused"
          ? S.library.processPaused
          : L.logExtracting;
    case "done":
      return L.logDone;
  }
}
