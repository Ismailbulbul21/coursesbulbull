import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zqpyvmswniaadflnpxlg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxcHl2bXN3bmlhYWRmbG5weGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MTQ2MDQsImV4cCI6MjA2NDA5MDYwNH0.ugepYjAe2qwmJucMA3sMpbnD7i1o2ZRsFnYJEj9W8Kc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) 