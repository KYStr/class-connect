import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, clientFor, createUser } from './helpers';

describe('RLS: consent isolation', () => {
  const admin = adminClient();
  let teacherA: { email: string; password: string; id: string };
  let parentA: { email: string; password: string; id: string };
  let parentB: { email: string; password: string; id: string };
  let classA: string;
  let studentA: string;
  let studentB: string;
  let consentId: string;

  beforeAll(async () => {
    teacherA = await createUser(admin, 'teacher', 'Teacher A');
    parentA = await createUser(admin, 'parent', 'Parent A');
    parentB = await createUser(admin, 'parent', 'Parent B');

    classA = (
      await admin.from('classes').insert({ teacher_id: teacherA.id, name: 'Class A' }).select('id').single()
    ).data!.id;
    studentA = (
      await admin.from('students').insert({ class_id: classA, seat: '01', name: 'Child A' }).select('id').single()
    ).data!.id;
    studentB = (
      await admin.from('students').insert({ class_id: classA, seat: '02', name: 'Child B' }).select('id').single()
    ).data!.id;
    await admin.from('guardianships').insert([
      { student_id: studentA, parent_id: parentA.id },
      { student_id: studentB, parent_id: parentB.id },
    ]);
    consentId = (
      await admin
        .from('consent_forms')
        .insert({ class_id: classA, title: 'Trip', body: 'Please sign', deadline: '2026-08-01' })
        .select('id')
        .single()
    ).data!.id;
  });

  it('parent A cannot sign for parent B child', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { error } = await a.from('consent_signatures').insert({
      consent_id: consentId,
      student_id: studentB,
      signed_by: parentA.id,
    });
    expect(error).toBeTruthy();
  });

  it('parent A can sign for own child', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { error } = await a.from('consent_signatures').insert({
      consent_id: consentId,
      student_id: studentA,
      signed_by: parentA.id,
    });
    expect(error).toBeNull();
  });

  it('parent A cannot read parent B signature row via student filter', async () => {
    await admin.from('consent_signatures').upsert({
      consent_id: consentId,
      student_id: studentB,
      signed_by: parentB.id,
    });
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('consent_signatures').select('*').eq('student_id', studentB);
    expect(data ?? []).toHaveLength(0);
  });

  it('teacher can read class signatures', async () => {
    const t = await clientFor(teacherA.email, teacherA.password);
    const { data, error } = await t.from('consent_signatures').select('*').eq('consent_id', consentId);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
