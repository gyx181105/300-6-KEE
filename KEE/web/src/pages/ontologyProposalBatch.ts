/** 批量采纳代理提案：按父类依赖排序，缺的端点从 edits 里摘掉，避免
 *  `class '…' does not exist` 把整批卡住。 */

export type BatchSection =
  | "map_to"
  | "entity_types"
  | "relation_types"
  | "attribute_types";

export type BatchItem = {
  section: BatchSection;
  key: string;
  label: string;
  parents?: string[];
  domains?: string[];
  ranges?: string[];
};

/** 类提案按父类拓扑排序：父在提案里的先加入。环或孤儿仍保留，排在后面。 */
export function orderClassProposals<T extends { key: string; parents?: string[] }>(
  proposals: T[],
): T[] {
  const byKey = new Map(proposals.map((p) => [p.key, p]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const out: T[] = [];

  const visit = (key: string) => {
    if (visited.has(key) || !byKey.has(key)) return;
    if (visiting.has(key)) return;
    visiting.add(key);
    const p = byKey.get(key)!;
    for (const parent of p.parents ?? []) visit(parent);
    visiting.delete(key);
    visited.add(key);
    out.push(p);
  };

  for (const p of proposals) visit(p.key);
  return out;
}

/** 只保留已经存在（或本批已加入）的类键，避免采纳时撞 unknown_class */
export function filterKnown(keys: string[] | undefined, known: Set<string>): string[] {
  return (keys ?? []).filter((k) => known.has(k));
}

/** 展平并排好一整批：先 map_to，再类（拓扑），再属性，再关系 */
export function flattenBatchOrder(input: {
  map_to?: { key: string; label?: string }[];
  entity_types: { key: string; label: string; parents?: string[] }[];
  attribute_types?: { key: string; label: string; domains?: string[] }[];
  relation_types: {
    key: string;
    label: string;
    domains?: string[];
    ranges?: string[];
  }[];
}): BatchItem[] {
  const items: BatchItem[] = [];
  for (const p of input.map_to ?? []) {
    items.push({ section: "map_to", key: p.key, label: p.label ?? p.key });
  }
  for (const p of orderClassProposals(input.entity_types)) {
    items.push({
      section: "entity_types",
      key: p.key,
      label: p.label,
      parents: p.parents,
    });
  }
  for (const p of input.attribute_types ?? []) {
    items.push({
      section: "attribute_types",
      key: p.key,
      label: p.label,
      domains: p.domains,
    });
  }
  for (const p of input.relation_types) {
    items.push({
      section: "relation_types",
      key: p.key,
      label: p.label,
      domains: p.domains,
      ranges: p.ranges,
    });
  }
  return items;
}

export function editsForItem(
  item: BatchItem,
  knownClasses: Set<string>,
):
  | { parents: string[] }
  | { domains: string[]; ranges?: string[] }
  | undefined {
  if (item.section === "entity_types") {
    return { parents: filterKnown(item.parents, knownClasses) };
  }
  if (item.section === "attribute_types") {
    return { domains: filterKnown(item.domains, knownClasses) };
  }
  if (item.section === "relation_types") {
    return {
      domains: filterKnown(item.domains, knownClasses),
      ranges: filterKnown(item.ranges, knownClasses),
    };
  }
  return undefined;
}
