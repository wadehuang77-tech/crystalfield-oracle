-- Schema only: no production decks, cards or private payloads are imported.
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  card_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  card_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_secondary TEXT,
  image TEXT,
  preview_payload TEXT NOT NULL DEFAULT '{}',
  gated_payload TEXT NOT NULL
);
CREATE INDEX idx_cards_deck ON cards(deck_id, position);
CREATE UNIQUE INDEX idx_cards_key ON cards(deck_id, card_key);
