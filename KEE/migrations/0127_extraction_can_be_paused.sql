-- 图谱抽取可暂停：graph_status 增加 paused。
-- 暂停时抬高 extract_epoch，正在跑的任务自行退出；已抽完的分块保留，继续时从断点接着抽。

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_graph_status_check;
ALTER TABLE documents
    ADD CONSTRAINT documents_graph_status_check
    CHECK (graph_status IN ('none', 'queued', 'extracting', 'done', 'failed', 'skipped', 'paused'));
