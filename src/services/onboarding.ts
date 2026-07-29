import { supabase } from '@/lib/supabase';

// Onboarding memory (SPEC L17 / DEVELOPMENT.md §5.5).
// Keys e.g. teacher_welcome, parent_welcome, pointout_grades.

export type OnboardingSeen = Record<string, boolean>;

type OnboardingRow = {
  profile_id: string;
  seen: OnboardingSeen;
  updated_at: string;
};

async function profileId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

/** Table typed after `pnpm gen:types`; until then use a narrow cast. */
function table() {
  return supabase.from('onboarding_state' as never);
}

export async function getOnboarding(): Promise<OnboardingSeen> {
  const id = await profileId();
  const { data, error } = await table()
    .select('seen')
    .eq('profile_id' as never, id)
    .maybeSingle();
  if (error) throw error;
  return ((data as OnboardingRow | null)?.seen as OnboardingSeen) ?? {};
}

export async function markOnboardingSeen(key: string): Promise<void> {
  const id = await profileId();
  const seen = await getOnboarding();
  if (seen[key]) return;
  const { error } = await table().upsert(
    {
      profile_id: id,
      seen: { ...seen, [key]: true },
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'profile_id' },
  );
  if (error) throw error;
}

/** Clear keys so tours can replay (設定「重看導覽」). */
export async function clearOnboardingSeen(keys: string[]): Promise<void> {
  const id = await profileId();
  const seen = { ...(await getOnboarding()) };
  for (const k of keys) delete seen[k];
  const { error } = await table().upsert(
    {
      profile_id: id,
      seen,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'profile_id' },
  );
  if (error) throw error;
}

export function pointOutKey(feature: string): string {
  return `pointout_${feature}`;
}

export const TEACHER_WELCOME_KEY = 'teacher_welcome';
export const PARENT_WELCOME_KEY = 'parent_welcome';
