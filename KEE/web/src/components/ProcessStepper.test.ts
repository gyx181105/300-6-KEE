import { describe, expect, it } from "vitest";
import { en } from "../i18n/en";
import {
  buildProcessStepperItems,
  durationsFromEnteredAt,
  enteredAtFromLines,
} from "./ProcessStepper";

describe("durationsFromEnteredAt", () => {
  it("measures closed steps against the next enter time", () => {
    const t0 = 1_000;
    const entered = [t0, t0 + 2_100, t0 + 9_100, null, null];
    expect(durationsFromEnteredAt(entered, t0 + 9_100)).toEqual([
      2_100,
      7_000,
      0,
      null,
      null,
    ]);
  });

  it("keeps the current step running until now", () => {
    const t0 = 10_000;
    const entered = [t0, t0 + 5_000, null];
    expect(durationsFromEnteredAt(entered, t0 + 12_000)).toEqual([
      5_000,
      7_000,
      null,
    ]);
  });
});

describe("enteredAtFromLines / buildProcessStepperItems", () => {
  it("takes the first sighting of each step", () => {
    const lines = [
      {
        at: 100,
        step: "pending" as const,
        status: "pending",
        graph_status: "none",
        chunk_count: 0,
        extracted_chunks: 0,
        size_bytes: 1,
      },
      {
        at: 500,
        step: "parsing" as const,
        status: "parsing",
        graph_status: "none",
        chunk_count: 0,
        extracted_chunks: 0,
        size_bytes: 1,
      },
      {
        at: 800,
        step: "parsing" as const,
        status: "parsing",
        graph_status: "none",
        chunk_count: 0,
        extracted_chunks: 0,
        size_bytes: 1,
      },
    ];
    expect(enteredAtFromLines(lines, 90)).toEqual([
      100,
      500,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("marks extracting as current with a live duration", () => {
    const t0 = 1_000;
    const items = buildProcessStepperItems({
      status: "ready",
      graphStatus: "extracting",
      labels: en.library.process.steps,
      lines: [
        {
          at: t0,
          step: "pending",
          status: "pending",
          graph_status: "none",
          chunk_count: 0,
          extracted_chunks: 0,
          size_bytes: 1,
        },
        {
          at: t0 + 20_000,
          step: "extracting",
          status: "ready",
          graph_status: "extracting",
          chunk_count: 10,
          extracted_chunks: 3,
          size_bytes: 1,
        },
      ],
      firstAt: t0,
      now: t0 + 30_000,
    });
    expect(items[5]?.state).toBe("current");
    expect(items[5]?.durationMs).toBe(10_000);
    expect(items[6]?.state).toBe("wait");
    expect(items[6]?.durationMs).toBeNull();
  });
});
