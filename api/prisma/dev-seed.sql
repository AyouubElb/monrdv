-- Two businesses for local development, so `atlas.localhost` and `anfa.localhost` resolve.
-- Runs as app_migrator (the table owner, so row level security does not apply).
-- Safe to run again. The demo data feature (scope feature 14) replaces it.
INSERT INTO businesses (subdomain, name)
VALUES ('atlas', 'Salon Atlas'), ('anfa', 'Clinique Anfa')
ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name;
