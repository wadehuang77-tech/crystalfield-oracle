ALTER TABLE meditation_playback_history ADD COLUMN session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_meditation_playback_session ON meditation_playback_history(session_id);
