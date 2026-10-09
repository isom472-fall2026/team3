import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iyfrafmocstribaduvnv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5ZnJhZm1vY3N0cmliYWR1dm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDE2NDYsImV4cCI6MjEwNTY3NzY0Nn0.Gh8fpObGn6oI7LPFns1w-QDigsGlrzolWUux0h-G6PQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
