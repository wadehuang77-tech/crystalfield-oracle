-- Additive localization tables for the separate bolt-tarot-cards database.
-- Apply only to the cards D1 after reviewing translated payloads.

CREATE TABLE IF NOT EXISTS deck_localizations (
  deck_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en')),
  name TEXT NOT NULL,
  PRIMARY KEY (deck_id, locale),
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_localizations (
  deck_id TEXT NOT NULL,
  card_key TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en')),
  name TEXT,
  name_secondary TEXT,
  preview_payload TEXT,
  gated_payload TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deck_id, card_key, locale),
  FOREIGN KEY (deck_id, card_key) REFERENCES cards(deck_id, card_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_card_localizations_locale
  ON card_localizations(locale, deck_id, card_key);