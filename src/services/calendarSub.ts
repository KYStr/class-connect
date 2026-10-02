import { supabase, supabaseUrl } from '@/lib/supabase';

export type ParentRemindDay = 'class' | 'same' | 'prev' | 'none';

export type CalendarSub = {
  token: string;
  remindDay: ParentRemindDay;
  remindTime: string;
};

function newToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getMyCalendarSub(classId: string): Promise<CalendarSub | null> {
  const { data: userData } = await supabase.auth.getUser();
  const profileId = userData.user?.id;
  if (!profileId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('calendar_subs')
    .select('token, remind_day, remind_time')
    .eq('class_id', classId)
    .eq('profile_id', profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const day = data.remind_day;
  const remindDay: ParentRemindDay =
    day === 'same' || day === 'prev' || day === 'none' || day === 'class' ? day : 'class';
  return { token: data.token, remindDay, remindTime: data.remind_time || '07:00' };
}

export async function saveMyCalendarSub(
  classId: string,
  input: { remindDay: ParentRemindDay; remindTime: string },
): Promise<CalendarSub> {
  const { data: userData } = await supabase.auth.getUser();
  const profileId = userData.user?.id;
  if (!profileId) throw new Error('Not authenticated');
  const existing = await getMyCalendarSub(classId);
  const token = existing?.token ?? newToken();
  const { data, error } = await supabase
    .from('calendar_subs')
    .upsert(
      {
        profile_id: profileId,
        class_id: classId,
        token,
        remind_day: input.remindDay,
        remind_time: input.remindTime,
      },
      { onConflict: 'profile_id,class_id' },
    )
    .select('token, remind_day, remind_time')
    .single();
  if (error) throw error;
  const day = data.remind_day;
  const remindDay: ParentRemindDay =
    day === 'same' || day === 'prev' || day === 'none' || day === 'class' ? day : 'class';
  return { token: data.token, remindDay, remindTime: data.remind_time || '07:00' };
}

export function calendarFeedUrls(token: string): { https: string; webcal: string } {
  const https = `${supabaseUrl}/functions/v1/calendar_feed?token=${encodeURIComponent(token)}`;
  return { https, webcal: https.replace(/^https:/, 'webcal:') };
}
