-- NAU Internal Voting System - Final Working Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor.
-- Warning: this resets old testing data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS election_roles CASCADE;
DROP TABLE IF EXISTS elections CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'voter' CHECK (role IN ('admin','voter','candidate')),
  phone VARCHAR(30),
  college VARCHAR(150),
  department VARCHAR(100),
  year VARCHAR(50),
  membership_status VARCHAR(20) DEFAULT 'active' CHECK (membership_status IN ('active','inactive','blocked')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(150) NOT NULL,
  description TEXT,
  chapter_name VARCHAR(150),
  venue VARCHAR(150),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','closed','cancelled')),
  results_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_election_time CHECK (end_time > start_time)
);

CREATE TABLE election_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  responsibilities TEXT,
  eligibility TEXT,
  max_winners INT DEFAULT 1 CHECK (max_winners >= 1),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES election_roles(id) ON DELETE CASCADE,
  statement TEXT NOT NULL,
  manifesto TEXT,
  experience TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES election_roles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(voter_id, role_id)
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(150) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_roles_election ON election_roles(election_id);
CREATE INDEX idx_candidates_role ON candidates(role_id);
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_election ON votes(election_id);
CREATE INDEX idx_votes_role ON votes(role_id);
CREATE INDEX idx_activity_created_at ON activity_logs(created_at);

-- Beginner/local development permissions.
-- This project uses Node.js backend + Supabase secret key.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE elections DISABLE ROW LEVEL SECURITY;
ALTER TABLE election_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
