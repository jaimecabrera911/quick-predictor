-- QuinielaApp PostgreSQL Schema for Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('super_admin','admin','user')),
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  season TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','active','finished')),
  accent TEXT NOT NULL DEFAULT 'green',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  external_id TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TEXT NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('group','round_of_16','quarter','semi','final')),
  group_name TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','finished')),
  home_score INTEGER,
  away_score INTEGER,
  current_minute INTEGER,
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS quinielas (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  name TEXT NOT NULL,
  description TEXT,
  deadline TEXT,
  access_type TEXT NOT NULL CHECK(access_type IN ('public','code')),
  invite_code TEXT UNIQUE,
  points_exact_score INTEGER NOT NULL DEFAULT 5,
  points_winner INTEGER NOT NULL DEFAULT 2,
  points_goal INTEGER NOT NULL DEFAULT 2,
  points_goal_diff INTEGER NOT NULL DEFAULT 1,
  prize REAL,
  entry_fee REAL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  quiniela_id TEXT NOT NULL REFERENCES quinielas(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  total_points REAL NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL DEFAULT (now()::text),
  UNIQUE(quiniela_id, user_id)
);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  match_id TEXT NOT NULL REFERENCES matches(id),
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  points_earned REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (now()::text),
  UNIQUE(participant_id, match_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_tournament_external ON matches(tournament_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_quinielas_tournament ON quinielas(tournament_id);
CREATE INDEX IF NOT EXISTS idx_participants_quiniela ON participants(quiniela_id);
CREATE INDEX IF NOT EXISTS idx_predictions_participant ON predictions(participant_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
