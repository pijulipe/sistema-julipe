import { createClient } from "@supabase/supabase-js";
import { ambiente } from "../config/ambiente.js";

export const supabaseAdmin = createClient(
  ambiente.SUPABASE_URL,
  ambiente.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
