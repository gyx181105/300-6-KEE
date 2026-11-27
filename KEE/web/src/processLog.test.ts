import { afterEach, describe, expect, it } from "vitest";
import type { Doc } from "./api";
import {
  formatElapsed,
  formatSize,
  getTrack,
  isBusy,
  listPanelTracks,
  observeDoc,
  resetProcessLog,
  resolveFirstAt,
  stepOf,
  summarize,
} from "./processLog";

afterEach(() => resetProcessLog());

const doc = (partial: Partial<Doc> & Pick<Doc, "id" | "status" | "graph_status">): Doc =>
  ({
    kb_id: "kb",
    source_id: null,
    filename: "a.pdf",
    mime: "application/pdf",
    size_bytes: 2_400_000,
    error: null,
    graph_error: null,
    chunk_count: 0,
    extracted_chunks: 0,
    tags: [],
    missing_since: null,
    deleted_at: null,
    purged_at: null,
    reader_needed: null,
    created_at: "2026-01-01T00:00:00Z",
    doc_time: null,
    doc_time_source: "none",
    ...partial,
  }) as Doc;

describe("stepOf", () => {
  it("walks ingest then graph", () => {
    expect(stepOf("pending", "none").index).toBe(0);
    expect(stepOf("parsing", "none").step).toBe("parsing");
    expect(stepOf("indexing", "none").index).toBe(2);
    expect(stepOf("embedding", "none").index).toBe(3);
    expect(stepOf("ready", "none").index).toBe(4);
    expect(stepOf("ready", "queued").step).toBe("extracting");
    expect(stepOf("ready", "extracting").index).toBe(5);
    expect(stepOf("ready", "done")).toEqual({
      step: "done",
      index: 6,
      failed: false,
      skipped: false,
    });
    expect(stepOf("ready", "skipped").skipped).toBe(true);
  });

  it("marks ingest and graph failures", () => {
    expect(stepOf("failed", "none").failed).toBe(true);
    expect(stepOf("ready", "failed")).toEqual({
      step: "extracting",
      index: 5,
      failed: true,
      skipped: false,
    });
  });
});

describe("isBusy", () => {
  it("covers both pipelines", () => {
    expect(isBusy("parsing", "none")).toBe(true);
    expect(isBusy("ready", "extracting")).toBe(true);
    expect(isBusy("ready", "paused")).toBe(true);
    expect(isBusy("ready", "done")).toBe(false);
  });
});

describe("resolveFirstAt", () => {
  it("prefers the earliest of server start, prior firstAt, and now", () => {
    const now = 1_700_000_100_000;
    expect(resolveFirstAt("2023-11-14T22:08:20.000Z", undefined, now)).toBe(
      Date.parse("2023-11-14T22:08:20.000Z"),
    );
    expect(resolveFirstAt(null, 1_700_000_000_000, now)).toBe(1_700_000_000_000);
    expect(resolveFirstAt(null, undefined, now)).toBe(now);
  });
});

describe("observeDoc", () => {
  it("records transitions and sizes for the activity panel", () => {
    observeDoc(doc({ id: "1", status: "pending", graph_status: "none" }));
    observeDoc(
      doc({ id: "1", status: "parsing", graph_status: "none", size_bytes: 2_400_000 }),
    );
    observeDoc(
      doc({
        id: "1",
        status: "ready",
        graph_status: "extracting",
        chunk_count: 36,
      }),
    );
    const tracks = listPanelTracks();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]!.lines.map((l) => l.step)).toEqual([
      "pending",
      "parsing",
      "extracting",
    ]);
    expect(tracks[0]!.snap.chunk_count).toBe(36);
    expect(summarize(tracks)).toEqual({ working: 1, queued: 0, failed: 0 });
  });

  it("ignores idle documents until they become busy", () => {
    observeDoc(doc({ id: "2", status: "ready", graph_status: "done", chunk_count: 3 }));
    expect(listPanelTracks()).toHaveLength(0);
  });

  it("keeps extracted_chunks monotonic across out-of-order snapshots", () => {
    observeDoc(
      doc({
        id: "3",
        status: "ready",
        graph_status: "extracting",
        extracted_chunks: 12,
        graph_started_at: "2023-11-14T22:00:00.000Z",
      }),
    );
    observeDoc(
      doc({
        id: "3",
        status: "ready",
        graph_status: "extracting",
        extracted_chunks: 9,
        graph_started_at: "2023-11-14T22:00:00.000Z",
      }),
    );
    expect(getTrack("3")!.snap.extracted_chunks).toBe(12);
    expect(getTrack("3")!.firstAt).toBe(Date.parse("2023-11-14T22:00:00.000Z"));
  });
});

describe("formatters", () => {
  it("formats size and elapsed", () => {
    expect(formatSize(800)).toBe("800 B");
    expect(formatSize(2400)).toBe("2 KB");
    expect(formatSize(2_400_000)).toBe("2.3 MB");
    expect(formatElapsed(4_000)).toBe("4s");
    expect(formatElapsed(65_000)).toBe("1m 05s");
  });
});
