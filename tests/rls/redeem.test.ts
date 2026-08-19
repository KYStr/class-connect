import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, anonClient, clientFor, createUser, ANON_KEY, FUNCTIONS_URL } from './helpers';

// End-to-end test for the atomic parent-binding Edge Function (DEVELOPMENT.md §7.2).
// Requires `supabase start` (edge runtime serves functions).

describe('redeem_invite Edge Function', () => {
  const admin = adminClient();
  let teacher: { id: string };
  let parent: { id: string; email: string; password: string };
  let parent2: { id: string; email: string; password: string };
  let classId: string;
  let studentId: string;
  let code: string;

  beforeAll(async () => {
    teacher = await createUser(admin, 'teacher', 'Teacher');
    parent = await createUser(admin, 'parent', 'Parent');
    parent2 = await createUser(admin, 'parent', 'Parent2');

    classId = (
      await admin.from('classes').insert({ teacher_id: teacher.id, name: 'C' }).select('id').single()
    ).data!.id;
    studentId = (
      await admin.from('students').insert({ class_id: classId, seat: '01', name: 'Kid' }).select('id').single()
    ).data!.id;
    code = `TEST${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await admin
      .from('invites')
      .insert({ class_id: classId, student_id: studentId, code, created_by: teacher.id });
  });

  async function callRedeem(token: string, body: unknown) {
    const res = await fetch(`${FUNCTIONS_URL}/redeem_invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  }

  it('rejects unauthenticated calls', async () => {
    const res = await fetch(`${FUNCTIONS_URL}/redeem_invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
      body: JSON.stringify({ code }),
    });
    expect(res.status).toBe(401);
  });

  it('binds parent to student and records last redeem', async () => {
    const parentClient = await clientFor(parent.email, parent.password);
    const token = (await parentClient.auth.getSession()).data.session!.access_token;

    const { status, json } = await callRedeem(token, {
      code,
      displayName: '小孩的家長',
      relation: '母親',
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({ studentId, classId });

    // Parent can now read exactly their child (RLS via new guardianship).
    const { data: kids } = await parentClient.from('students').select('id');
    expect((kids ?? []).map((k) => k.id)).toEqual([studentId]);

    // Last redeem is audited; code stays reusable.
    const { data: inv } = await admin.from('invites').select('used_at, used_by, revoked_at').eq('code', code).single();
    expect(inv!.used_at).toBeTruthy();
    expect(inv!.used_by).toBe(parent.id);
    expect(inv!.revoked_at).toBeNull();
  });

  it('allows a second parent to redeem the same family invite', async () => {
    const parentClient = await clientFor(parent2.email, parent2.password);
    const token = (await parentClient.auth.getSession()).data.session!.access_token;
    const { status, json } = await callRedeem(token, {
      code,
      displayName: '另一位家長',
      relation: '父親',
    });
    expect(status).toBe(200);
    expect(json).toMatchObject({ studentId, classId });

    const { data: kids } = await parentClient.from('students').select('id');
    expect((kids ?? []).map((k) => k.id)).toEqual([studentId]);

    const { count } = await admin
      .from('guardianships')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);
    expect(count).toBe(2);
  });

  it('rejects a revoked code', async () => {
    await admin
      .from('invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('code', code);

    const parentClient = anonClient();
    await parentClient.auth.signInWithPassword({ email: parent.email, password: parent.password });
    const token = (await parentClient.auth.getSession()).data.session!.access_token;
    const { status, json } = await callRedeem(token, { code, displayName: 'x' });
    expect(status).toBe(410);
    expect(json).toMatchObject({ error: 'code_revoked' });
  });

  it('rejects an invalid code', async () => {
    const parentClient = await clientFor(parent.email, parent.password);
    const token = (await parentClient.auth.getSession()).data.session!.access_token;
    const { status } = await callRedeem(token, { code: 'NOPE9999', displayName: 'x' });
    expect(status).toBe(404);
  });
});
