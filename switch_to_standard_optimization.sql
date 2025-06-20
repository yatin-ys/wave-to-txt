-- Switch to Standard Optimization (No Custom Functions)
-- This approach avoids function security warnings entirely
-- Run this in Supabase SQL editor

-- Remove the custom function (if you want to avoid function warnings)
DROP FUNCTION IF EXISTS current_user_id();

-- Drop existing policies
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

-- Create standard optimized policies (no custom functions)
-- TRANSCRIPTIONS - Using (select auth.uid())
CREATE POLICY "Users can view own transcriptions" ON transcriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own transcriptions" ON transcriptions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own transcriptions" ON transcriptions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own transcriptions" ON transcriptions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- SUMMARIES - Using (select auth.uid())
CREATE POLICY "Users can view own summaries" ON summaries
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own summaries" ON summaries
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own summaries" ON summaries
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own summaries" ON summaries
  FOR DELETE USING ((select auth.uid()) = user_id);

-- CHAT SESSIONS - Using (select auth.uid())
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- CHAT MESSAGES - Using (select auth.uid())
CREATE POLICY "Users can view own chat messages" ON chat_messages
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own chat messages" ON chat_messages
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own chat messages" ON chat_messages
  FOR DELETE USING ((select auth.uid()) = user_id); 