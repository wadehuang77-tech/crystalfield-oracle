CREATE TABLE facebook_identities (
  app_id TEXT NOT NULL,
  facebook_sub TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(app_id,facebook_sub),
  UNIQUE(app_id,user_id)
);
