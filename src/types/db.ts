// GENERATED FILE — do not edit by hand (AGENTS.md §7, rail 4).
// Run `pnpm gen:types` (supabase gen types) to regenerate from the local DB.
//
// Placeholder until the local Supabase stack + migrations exist (P1).
// It keeps `createClient<Database>` typed without blocking P0 scaffolding.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
