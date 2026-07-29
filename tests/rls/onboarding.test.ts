import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, clientFor, createUser } from './helpers';

describe('RLS: onboarding_state', () => {
  const admin = adminClient();
  let userA: { email: string; password: string; id: string };
  let userB: { email: string; password: string; id: string };

  beforeAll(async () => {
    userA = await createUser(admin, 'teacher', 'Tour A');
    userB = await createUser(admin, 'teacher', 'Tour B');
  });

  it('user can upsert own onboarding seen map', async () => {
    const a = await clientFor(userA.email, userA.password);
    const { error } = await a.from('onboarding_state').upsert(
      {
        profile_id: userA.id,
        seen: { teacher_welcome: true },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );
    expect(error).toBeFalsy();

    const { data } = await a.from('onboarding_state').select('seen').eq('profile_id', userA.id).single();
    expect((data?.seen as { teacher_welcome?: boolean })?.teacher_welcome).toBe(true);
  });

  it('user A cannot read or write user B onboarding', async () => {
    await admin.from('onboarding_state').upsert({
      profile_id: userB.id,
      seen: { teacher_welcome: true },
      updated_at: new Date().toISOString(),
    });

    const a = await clientFor(userA.email, userA.password);
    const { data } = await a.from('onboarding_state').select('*').eq('profile_id', userB.id);
    expect(data ?? []).toHaveLength(0);

    const { error } = await a.from('onboarding_state').upsert(
      {
        profile_id: userB.id,
        seen: { hacked: true },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    );
    expect(error).toBeTruthy();
  });
});
