import { supabase } from '@/lib/supabase';
import { normalizeSeat } from '@/services/students';

export type ParsedRosterRow = { seat: string; name: string };

/** Teacher-only Edge Function: messy paste → structured roster preview. */
export async function parseRosterText(text: string): Promise<ParsedRosterRow[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('請先貼上名單文字');

  const { data, error } = await supabase.functions.invoke('parse_roster', {
    body: { text: trimmed },
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      let body: { error?: string } | null = null;
      try {
        body = (await ctx.json()) as { error?: string };
      } catch {
        body = null;
      }
      if (body?.error === 'openai_not_configured') {
        throw new Error('智慧貼上尚未設定（缺少 OpenAI key）');
      }
      if (body?.error === 'forbidden') throw new Error('僅老師可使用智慧貼上');
      if (body?.error === 'text_too_long') throw new Error('文字太長，請分段貼上');
      if (body?.error) throw new Error(`辨識失敗：${body.error}`);
    }
    throw new Error(error.message || '辨識失敗，請再試一次');
  }

  const rows = ((data as { students?: ParsedRosterRow[] } | null)?.students ?? [])
    .map((r) => ({
      seat: normalizeSeat(r.seat),
      name: String(r.name ?? '').trim(),
    }))
    .filter((r) => r.seat && r.name);

  if (rows.length === 0) throw new Error('沒有辨識到學生，請檢查貼上的內容');
  return rows;
}
