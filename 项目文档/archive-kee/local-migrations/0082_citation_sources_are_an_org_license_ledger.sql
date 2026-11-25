-- 通用来源许可台账：组织内登记「哪些材料可被当作知识引用」。
-- 与摄入连接器 sources 表无关；供账户「来源与许可」与知识闸门使用。

CREATE TABLE citation_sources (
    id                 UUID PRIMARY KEY,
    org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_key         TEXT NOT NULL,
    name               TEXT NOT NULL,
    publisher          TEXT NOT NULL DEFAULT '',
    version            TEXT NOT NULL DEFAULT '',
    license_status     TEXT NOT NULL
                       CHECK (license_status IN ('authorized', 'restricted', 'denied')),
    license_ref        TEXT NOT NULL DEFAULT '',
    display_boundary   TEXT NOT NULL
                       CHECK (display_boundary IN ('full', 'citation_only', 'none')),
    responsible_party  TEXT NOT NULL DEFAULT '',
    title              TEXT,
    citation           TEXT,
    body_excerpt       TEXT,
    created_by         UUID REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, source_key)
);

CREATE INDEX citation_sources_org_idx ON citation_sources (org_id);
