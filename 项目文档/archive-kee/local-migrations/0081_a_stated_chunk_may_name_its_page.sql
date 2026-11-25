-- A3 / 0040 修订：文字层 PDF 按页切段时，stated 块可以带 {"page": n}，
-- 仍无 origin_model；没有页信息时 anchor 继续为空（char_start/end 已够）。
ALTER TABLE chunks DROP CONSTRAINT chunks_anchor_matches_origin;

ALTER TABLE chunks ADD CONSTRAINT chunks_anchor_matches_origin CHECK (
    (origin = 'stated' AND origin_model IS NULL AND (
        anchor IS NULL OR anchor ? 'page'
    ))
    OR (origin = 'ocr' AND anchor ? 'page')
    OR (origin = 'transcribed' AND anchor ? 'start_ms' AND anchor ? 'end_ms' AND anchor ? 'speaker')
    OR (origin = 'described' AND anchor IS NOT NULL)
);
