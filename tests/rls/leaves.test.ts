import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, clientFor, createUser } from './helpers';

describe('RLS: leaves isolation', () => {
  const admin = adminClient();
  let teacherA: { email: string; password: string; id: string };
  let teacherB: { email: string; password: string; id: string };
  let parentA: { email: string; password: string; id: string };
  let parentB: { email: string; password: string; id: string };
  let classA: string;
  let classB: string;
  let studentA: string;
  let studentB: string;
  let leaveA: string;

  beforeAll(async () => {
    teacherA = await createUser(admin, 'teacher', 'Teacher A');
    teacherB = await createUser(admin, 'teacher', 'Teacher B');
    parentA = await createUser(admin, 'parent', 'Parent A');
    parentB = await createUser(admin, 'parent', 'Parent B');

    classA = (
      await admin.from('classes').insert({ teacher_id: teacherA.id, name: 'Class A' }).select('id').single()
    ).data!.id;
    classB = (
      await admin.from('classes').insert({ teacher_id: teacherB.id, name: 'Class B' }).select('id').single()
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

    leaveA = (
      await admin
        .from('leaves')
        .insert({
          class_id: classA,
          student_id: studentA,
          parent_id: parentA.id,
          leave_date: '2026-07-24',
          type: 'sick',
          reason: 'fever',
          status: 'pending',
        })
        .select('id')
        .single()
    ).data!.id;
  });

  it('parent A cannot read parent B leave', async () => {
    await admin.from('leaves').insert({
      class_id: classA,
      student_id: studentB,
      parent_id: parentB.id,
      leave_date: '2026-07-25',
      type: 'personal',
      reason: 'trip',
      status: 'pending',
    });
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('leaves').select('*').eq('student_id', studentB);
    expect(data ?? []).toHaveLength(0);
  });

  it('parent A can read own leave', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('leaves').select('*').eq('student_id', studentA);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('parent cannot update leave status (no policy)', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data, error } = await a
      .from('leaves')
      .update({ status: 'approved' })
      .eq('id', leaveA)
      .select();
    expect(error || (data ?? []).length === 0).toBeTruthy();
    const { data: row } = await admin.from('leaves').select('status').eq('id', leaveA).single();
    expect(row!.status).toBe('pending');
  });

  it('teacher B cannot review leave in class A', async () => {
    const t = await clientFor(teacherB.email, teacherB.password);
    const { data, error } = await t
      .from('leaves')
      .update({ status: 'approved' })
      .eq('id', leaveA)
      .select();
    expect(error || (data ?? []).length === 0).toBeTruthy();
  });

  it('teacher A can review leave in own class', async () => {
    const t = await clientFor(teacherA.email, teacherA.password);
    const { error } = await t
      .from('leaves')
      .update({ status: 'approved', reviewed_by: teacherA.id })
      .eq('id', leaveA);
    expect(error).toBeNull();
  });

  it('teacher B cannot insert event into class A', async () => {
    const t = await clientFor(teacherB.email, teacherB.password);
    const { error } = await t.from('events').insert({
      class_id: classA,
      title: 'Hack',
      event_date: '2026-08-01',
      type: 'activity',
    });
    expect(error).toBeTruthy();
    void classB;
  });
});
