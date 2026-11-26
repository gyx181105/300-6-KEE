-- 图谱抽取本轮开始时刻：刷新页面后前端仍能续算「已用时长」。
-- 新排队时写入；暂停/继续保留；停止或重新全量排队时清掉/重写。

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS graph_started_at TIMESTAMPTZ;

-- 正在抽/排队/暂停的：用 updated_at 顶上，总比从 0 开始强
UPDATE documents
   SET graph_started_at = updated_at
 WHERE graph_started_at IS NULL
   AND graph_status IN ('queued', 'extracting', 'paused');
