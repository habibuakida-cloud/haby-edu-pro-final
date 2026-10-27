-- ==============================================================================
-- HABY EDU PRO: STUDENT GOVERNMENT ELECTION SYSTEM MODULE
-- DISCIPLINE DEPARTMENT (IDARA YA NIDHAMU NA MAADILI)
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. ELECTION EVENTS TABLE
CREATE TABLE IF NOT EXISTS election_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    nomination_start TIMESTAMP NOT NULL,
    nomination_end TIMESTAMP NOT NULL,
    voting_start TIMESTAMP NOT NULL,
    voting_end TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'NOMINATION_OPEN', 'VOTING_OPEN', 'CLOSED', 'RESULTS_PUBLISHED'
    created_by_discipline_head TEXT,
    results_published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by school and status
CREATE INDEX IF NOT EXISTS idx_election_events_school_status ON election_events(school_id, status);

-- 2. ELECTION POSITIONS TABLE
CREATE TABLE IF NOT EXISTS election_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    gender_rule TEXT DEFAULT 'ALL', -- 'ALL', 'BOYS_ONLY', 'GIRLS_ONLY'
    class_rule TEXT DEFAULT 'ALL', -- 'ALL', 'FORM_3_4', 'FORM_1_2', 'FORM_5_6', etc.
    order_number INTEGER DEFAULT 1,
    is_custom BOOLEAN DEFAULT FALSE,
    photo_required BOOLEAN DEFAULT TRUE,
    manifesto_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_positions_election ON election_positions(election_id, order_number);

-- 3. ELECTION CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS election_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_class TEXT NOT NULL,
    student_gender TEXT DEFAULT 'Male',
    manifesto_text TEXT,
    manifesto_video_url TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    rejection_reason TEXT,
    reviewed_by TEXT,
    votes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_election_candidates_election_position ON election_candidates(election_id, position_id, status);

-- 4. ELECTION VOTES TABLE (AUDITABLE, SECRET BALLOT, PREVENTS DOUBLE VOTING)
CREATE TABLE IF NOT EXISTS election_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID NOT NULL REFERENCES election_events(id) ON DELETE CASCADE,
    voter_student_id TEXT NOT NULL,
    position_id UUID NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES election_candidates(id) ON DELETE CASCADE,
    voted_at TIMESTAMP DEFAULT NOW(),
    ip_address TEXT,
    device_id TEXT,
    verification_method TEXT DEFAULT 'PORTAL_AUTH', -- 'PIN', 'FINGERPRINT', 'PORTAL_AUTH'
    CONSTRAINT unique_voter_position_election UNIQUE (election_id, voter_student_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_election_votes_audit ON election_votes(election_id, position_id);

-- 5. FUNCTION TO INCREMENT CANDIDATE VOTE COUNT ATOMICALLY
CREATE OR REPLACE FUNCTION increment_candidate_vote(p_candidate_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE election_candidates
    SET votes_count = votes_count + 1,
        updated_at = NOW()
    WHERE id = p_candidate_id;
END;
$$ LANGUAGE plpgsql;
