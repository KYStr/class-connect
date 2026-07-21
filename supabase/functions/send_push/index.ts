// Edge Function: send_push (DEVELOPMENT.md §11). Sends Web Push via VAPID.
// P0 stub — full logic (web-push + VAPID private key, notify profile subscriptions) lands in P4.
//
// POST /functions/v1/send_push  body: { profileIds: string[], title: string, body: string, url: string }

// @ts-expect-error Deno import — resolved in the Supabase Edge runtime, not by the app tsconfig.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

serve(async (_req: Request) => {
  return new Response(JSON.stringify({ error: 'not_implemented', phase: 'P4' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
});
