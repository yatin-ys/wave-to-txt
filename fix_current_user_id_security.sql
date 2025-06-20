-- Fix security warning for current_user_id function
-- This resolves the "Function Search Path Mutable" warning
-- Run this in Supabase SQL editor

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid();
$$; 