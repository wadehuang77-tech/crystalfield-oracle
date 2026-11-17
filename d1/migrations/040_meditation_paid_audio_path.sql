UPDATE meditation_audio_tracks
SET r2_key = 'meditation/冥想課程音檔/' || id || '.mp3', updated_at = datetime('now')
WHERE is_free = 0;
