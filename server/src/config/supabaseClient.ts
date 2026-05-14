import { createClient, SupabaseClient } from "@supabase/supabase-js";

let anonClient: SupabaseClient | null = null;

function getAnonClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;
  if (!anonClient) {
    anonClient = createClient(url, anonKey);
  }
  return anonClient;
}

/**
 * Returns a Supabase client. Without a token, returns a shared anon client.
 * With a token, returns a new client that sends Authorization on each request.
 */
export function getSupabaseClient(accessToken?: string): SupabaseClient {
  const url = process.env.SUPABASE_URL!;
  const anonKey = process.env.SUPABASE_ANON_KEY!;

  if (accessToken) {
    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  return getAnonClient();
}
