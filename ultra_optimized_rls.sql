-- ALTERNATIVE: Ultra-Optimized RLS using Security Definer Function
-- This is even more performant for high-traffic scenarios
-- Choose either this OR the previous optimization (not both)

-- Create a security definer function for current user
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Drop existing policies (same as before)
DROP POLICY IF EXISTS "Users can view own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can insert own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can update own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can delete own transcriptions" ON transcriptions;

DROP POLICY IF EXISTS "Users can view own summaries" ON summaries;
DROP POLICY IF EXISTS "Users can insert own summaries" ON summaries;
DROP POLICY IF EXISTS "Users can update own summaries" ON summaries;
DROP POLICY IF EXISTS "Users can delete own summaries" ON summaries;

DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;

DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON chat_messages;

-- Ultra-optimized policies using security definer function
-- TRANSCRIPTIONS
CREATE POLICY "Users can view own transcriptions" ON transcriptions
  FOR SELECT USING (current_user_id() = user_id);

CREATE POLICY "Users can insert own transcriptions" ON transcriptions
  FOR INSERT WITH CHECK (current_user_id() = user_id);

CREATE POLICY "Users can update own transcriptions" ON transcriptions
  FOR UPDATE USING (current_user_id() = user_id);

CREATE POLICY "Users can delete own transcriptions" ON transcriptions
  FOR DELETE USING (current_user_id() = user_id);

-- SUMMARIES
CREATE POLICY "Users can view own summaries" ON summaries
  FOR SELECT USING (current_user_id() = user_id);

CREATE POLICY "Users can insert own summaries" ON summaries
  FOR INSERT WITH CHECK (current_user_id() = user_id);

CREATE POLICY "Users can update own summaries" ON summaries
  FOR UPDATE USING (current_user_id() = user_id);

CREATE POLICY "Users can delete own summaries" ON summaries
  FOR DELETE USING (current_user_id() = user_id);

-- CHAT SESSIONS
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (current_user_id() = user_id);

CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (current_user_id() = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (current_user_id() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING (current_user_id() = user_id);

-- CHAT MESSAGES
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING (current_user_id() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (current_user_id() = user_id);

CREATE POLICY "Users can update own chat messages" ON chat_messages
  FOR UPDATE USING (current_user_id() = user_id);

CREATE POLICY "Users can delete own chat messages" ON chat_messages
  FOR DELETE USING (current_user_id() = user_id); 