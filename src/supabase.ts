import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://seeauhltrvdxhlalgjpn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZWF1aGx0cnZkeGhsYWxnanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA5MDUsImV4cCI6MjA3NjcxNjkwNX0.evcsZ8u_Of5Ph4y7QECuuTqXGxQVG4b222fsxVCs8xM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
