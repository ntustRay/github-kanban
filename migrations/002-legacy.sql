BEGIN;
ALTER TABLE board_cards DROP CONSTRAINT IF EXISTS board_cards_status_check;
ALTER TABLE board_cards ADD CONSTRAINT board_cards_status_check
  CHECK (status IN ('legacy','backlog','in_progress','verify','formal','archive'));
ALTER TABLE board_presets DROP CONSTRAINT IF EXISTS board_presets_status_check;
ALTER TABLE board_presets ADD CONSTRAINT board_presets_status_check
  CHECK (status IN ('legacy','backlog','in_progress','verify','formal','archive'));
COMMIT;
