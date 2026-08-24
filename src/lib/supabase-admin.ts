import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSb = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

export function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://ycguhqvuixcwmpqlxjif.supabase.co";
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set"
    );
  }

  if (!globalForSb.supabaseAdmin) {
    globalForSb.supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return globalForSb.supabaseAdmin;
}

export const PRODUCT_IMAGES_BUCKET = "product-images";
