import { describe, expect, it } from "vitest";
import {
  editsForItem,
  filterKnown,
  flattenBatchOrder,
  orderClassProposals,
} from "./ontologyProposalBatch";

describe("orderClassProposals", () => {
  it("puts parents before children", () => {
    const ordered = orderClassProposals([
      { key: "worker", parents: ["person"] },
      { key: "person", parents: ["institution"] },
      { key: "institution" },
    ]);
    expect(ordered.map((p) => p.key)).toEqual([
      "institution",
      "person",
      "worker",
    ]);
  });

  it("tolerates a cycle without dropping either", () => {
    const ordered = orderClassProposals([
      { key: "a", parents: ["b"] },
      { key: "b", parents: ["a"] },
    ]);
    expect(ordered.map((p) => p.key).sort()).toEqual(["a", "b"]);
  });
});

describe("flattenBatchOrder", () => {
  it("runs map_to, then classes, attributes, relations", () => {
    const items = flattenBatchOrder({
      map_to: [{ key: "org", label: "Org" }],
      entity_types: [
        { key: "clinic", label: "诊所", parents: ["facility"] },
        { key: "facility", label: "机构" },
      ],
      attribute_types: [{ key: "dose", label: "剂量", domains: ["clinic"] }],
      relation_types: [
        {
          key: "has_right",
          label: "拥有处方权",
          domains: ["facility"],
          ranges: ["right"],
        },
      ],
    });
    expect(items.map((i) => `${i.section}:${i.key}`)).toEqual([
      "map_to:org",
      "entity_types:facility",
      "entity_types:clinic",
      "attribute_types:dose",
      "relation_types:has_right",
    ]);
  });
});

describe("editsForItem", () => {
  it("drops unknown parents and ends", () => {
    const known = new Set(["facility"]);
    expect(
      editsForItem(
        {
          section: "entity_types",
          key: "clinic",
          label: "诊所",
          parents: ["facility", "person"],
        },
        known,
      ),
    ).toEqual({ parents: ["facility"] });
    expect(
      editsForItem(
        {
          section: "relation_types",
          key: "has_right",
          label: "拥有",
          domains: ["facility", "ghost"],
          ranges: ["missing"],
        },
        known,
      ),
    ).toEqual({ domains: ["facility"], ranges: [] });
  });

  it("filterKnown keeps only present keys", () => {
    expect(filterKnown(["a", "b"], new Set(["b"]))).toEqual(["b"]);
  });
});
