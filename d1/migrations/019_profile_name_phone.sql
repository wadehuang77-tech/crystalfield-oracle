-- Adds optional contact fields to the shared profile model.
-- Existing and Google-only members remain valid because both columns are nullable.
ALTER TABLE profiles ADD COLUMN name TEXT;
ALTER TABLE profiles ADD COLUMN phone TEXT;
