-- Row Level Security policies. Game server uses service_role key to bypass.
-- Client (with anon key) only sees data scoped to the authenticated user.

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gacha_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE boss_kills ENABLE ROW LEVEL SECURITY;

-- Accounts: each user can read/update their own row
CREATE POLICY "users_self_read_account" ON accounts FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_self_update_account" ON accounts FOR UPDATE USING (auth.uid() = id);

-- Characters: belong to my account
CREATE POLICY "users_own_characters_read" ON characters FOR SELECT
  USING (account_id = auth.uid());
CREATE POLICY "users_own_characters_modify" ON characters FOR ALL
  USING (account_id = auth.uid())
  WITH CHECK (account_id = auth.uid());

-- Inventory: through character ownership
CREATE POLICY "users_own_inventory_read" ON inventory FOR SELECT
  USING (character_id IN (SELECT id FROM characters WHERE account_id = auth.uid()));

-- Word progress: same scope
CREATE POLICY "users_own_word_progress_read" ON word_progress FOR SELECT
  USING (character_id IN (SELECT id FROM characters WHERE account_id = auth.uid()));

-- Gacha tokens: same scope
CREATE POLICY "users_own_gacha_read" ON gacha_tokens FOR SELECT
  USING (character_id IN (SELECT id FROM characters WHERE account_id = auth.uid()));

-- Classroom: members can read their classroom
CREATE POLICY "members_read_classroom" ON classrooms FOR SELECT
  USING (id IN (SELECT classroom_id FROM accounts WHERE id = auth.uid()));

-- Chat logs: members of same classroom
CREATE POLICY "classroom_chat_read" ON chat_logs FOR SELECT
  USING (classroom_id IN (SELECT classroom_id FROM accounts WHERE id = auth.uid()));

-- Auction listings: anyone in same classroom can browse
CREATE POLICY "classroom_auction_read" ON auction_items FOR SELECT
  USING (
    seller_id IN (
      SELECT c.id FROM characters c
      JOIN accounts a ON a.id = c.account_id
      WHERE a.classroom_id IN (SELECT classroom_id FROM accounts WHERE id = auth.uid())
    )
    OR status = 'active'
  );

-- Guild warehouse: members of same classroom only
CREATE POLICY "guild_warehouse_classroom" ON guild_warehouse FOR SELECT
  USING (classroom_id IN (SELECT classroom_id FROM accounts WHERE id = auth.uid()));

-- Boss kills: anyone can read (leaderboards)
CREATE POLICY "boss_kills_public_read" ON boss_kills FOR SELECT USING (TRUE);

-- Note: All write operations from the game server use the service_role key,
-- which bypasses RLS. The above policies are read-only safeguards for the
-- client-side anon key.
