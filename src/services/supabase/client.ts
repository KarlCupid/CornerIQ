import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface CornerSupabaseConfig {
  url: string;
  anonKey: string;
}

export function createCornerSupabaseClient(config: CornerSupabaseConfig): SupabaseClient {
  return createClient(config.url, config.anonKey);
}
