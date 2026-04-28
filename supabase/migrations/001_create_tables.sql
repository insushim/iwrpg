-- Runeword Chronicle — schema migration 001
-- Creates accounts, classrooms, characters, inventory, word_progress, gacha_tokens, etc.

-- ===== Classrooms (= Guilds) =====
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID,
  invite_code TEXT UNIQUE NOT NULL,
  classroom_mode BOOLEAN DEFAULT TRUE,
  daily_play_minutes INT DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Accounts (linked to Supabase Auth) =====
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  classroom_id UUID REFERENCES classrooms(id),
  grade TEXT DEFAULT 'g5' CHECK (grade IN ('g3','g4','g5','g6','m1','m2')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- ===== Characters =====
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT UNIQUE NOT NULL,
  class_id TEXT NOT NULL CHECK (class_id IN ('aether-lord','iron-sentinel','sylvan-ranger','rune-weaver')),
  level INT DEFAULT 1,
  exp BIGINT DEFAULT 0,
  hp INT DEFAULT 50,
  max_hp INT DEFAULT 50,
  mp INT DEFAULT 20,
  max_mp INT DEFAULT 20,
  stat_str INT DEFAULT 10,
  stat_con INT DEFAULT 10,
  stat_dex INT DEFAULT 10,
  stat_int INT DEFAULT 10,
  stat_wis INT DEFAULT 10,
  stat_points_unspent INT DEFAULT 0,
  gold BIGINT DEFAULT 100,
  classroom_coin INT DEFAULT 0,
  pos_x INT DEFAULT 30,
  pos_y INT DEFAULT 30,
  current_map TEXT DEFAULT 'aurora_town',
  alignment INT DEFAULT 0,
  quiz_streak_best INT DEFAULT 0,
  total_quizzes INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Inventory =====
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  quantity INT DEFAULT 1,
  enchant_level INT DEFAULT 0 CHECK (enchant_level >= 0 AND enchant_level <= 9),
  is_equipped BOOLEAN DEFAULT FALSE,
  equipped_slot TEXT,
  slot_position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Word learning progress =====
CREATE TABLE IF NOT EXISTS word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL,
  correct_count INT DEFAULT 0,
  wrong_count INT DEFAULT 0,
  cycle_count INT DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  is_in_active_pool BOOLEAN DEFAULT TRUE,
  UNIQUE(character_id, word_id)
);

-- ===== Gacha tokens =====
CREATE TABLE IF NOT EXISTS gacha_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tokens_earned INT DEFAULT 0,
  challenges_attempted INT DEFAULT 0,
  challenges_correct INT DEFAULT 0,
  UNIQUE(character_id, date)
);

-- ===== Boss kills =====
CREATE TABLE IF NOT EXISTS boss_kills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id TEXT NOT NULL,
  classroom_id UUID,
  contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
  killed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Chat logs (for teacher monitoring) =====
CREATE TABLE IF NOT EXISTS chat_logs (
  id BIGSERIAL PRIMARY KEY,
  classroom_id UUID,
  character_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('world','guild','whisper','system')),
  message TEXT NOT NULL,
  flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Auction listings =====
CREATE TABLE IF NOT EXISTS auction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  item_data JSONB NOT NULL,
  price BIGINT NOT NULL CHECK (price > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','sold','expired','canceled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== Guild warehouse =====
CREATE TABLE IF NOT EXISTS guild_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  item_data JSONB NOT NULL,
  deposited_by UUID REFERENCES characters(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_character ON inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_character ON word_progress(character_id);
CREATE INDEX IF NOT EXISTS idx_word_progress_active ON word_progress(character_id, is_in_active_pool);
CREATE INDEX IF NOT EXISTS idx_chat_classroom ON chat_logs(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gacha_char_date ON gacha_tokens(character_id, date);
CREATE INDEX IF NOT EXISTS idx_auction_status ON auction_items(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_characters_account ON characters(account_id);

-- Seed default classroom for development
INSERT INTO classrooms (id, name, invite_code, classroom_mode)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '시연용 학급 (Demo Classroom)',
  'TEST1234',
  TRUE
)
ON CONFLICT (invite_code) DO NOTHING;
