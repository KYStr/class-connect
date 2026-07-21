// Edge Function: redeem_invite (DEVELOPMENT.md §7.2). Security-definer, atomic invite binding.
// P0 stub — full logic (validate code, create guardianship, mark used, ensure conversation)
// lands in P1. Deployed via `supabase functions deploy redeem_invite`.
//
// POST /functions/v1/redeem_invite  body: { code: string, displayName: string, relation?: string }
// returns: { studentId: string, classId: string }

// @ts-expect-error Deno import — resolved in the Supabase Edge runtime, not by the app tsconfig.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (_req: Request) => {
  return new Response(JSON.stringify({ error: 'not_implemented', phase: 'P1' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
});
