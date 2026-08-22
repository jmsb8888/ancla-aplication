import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Revisa el archivo .env.local.",
  );
}

export const supabase = createClient<Database>(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
