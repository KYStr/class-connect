// Shared helper for P0 service stubs. The service layer is the ONLY seam that talks to
// Supabase (AGENTS.md rail 5). These signatures match DEVELOPMENT.md §8; bodies are filled
// in per feature during P1–P3. Reads return empty defaults so the P0 shell renders empty
// states; writes throw until wired.

export function notImplemented(fn: string): never {
  throw new Error(`[service] ${fn} not implemented yet (see DEVELOPMENT.md §8 / milestones §15)`);
}
