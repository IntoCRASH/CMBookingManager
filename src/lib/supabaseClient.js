import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdvnltssdeaqdkxmnwyl.supabase.co';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impkdm5sdHNzZGVhcWRreG1ud3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDUyNDAsImV4cCI6MjA5ODg4MTI0MH0.5zRa6Bf6wIInDILdGQHREx1IPlvmp0SjpOlrp-S47aw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);