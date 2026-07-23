import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, clientFor, createUser } from './helpers';

// Feature gating (SPEC L16 / DEVELOPMENT.md §5.5): teacher manages own class switches;
// class members read; parents (and other teachers) cannot write.

describe('RLS: class_features gating', () => {
  const admin = adminClient();
  let teacherA: { id: string; email: string; password: string };
  let teacherB: { id: string; email: string; password: string };
  let parentA: { id: string; email: string; password: string };
  let classA: string;

  beforeAll(async () => {
    teacherA = await createUser(admin, 'teacher', 'Teacher A');
    teacherB = await createUser(admin, 'teacher', 'Teacher B');
    parentA = await createUser(admin, 'parent', 'Parent A');

    classA = (
      await admin.from('classes').insert({ teacher_id: teacherA.id, name: 'A' }).select('id').single()
    ).data!.id;
    const studentA = (
      await admin.from('students').insert({ class_id: classA, seat: '01', name: 'Kid' }).select('id').single()
    ).data!.id;
    await admin.from('guardianships').insert({ student_id: studentA, parent_id: parentA.id });
  });

  it('new class auto-seeds core-3 enabled and opt-ins disabled', async () => {
    const { data } = await admin
      .from('class_features')
      .select('feature, enabled')
      .eq('class_id', classA);
    const map = Object.fromEntries((data ?? []).map((r) => [r.feature, r.enabled]));
    expect(data).toHaveLength(8);
    expect(map.announcements).toBe(true);
    expect(map.contact).toBe(true);
    expect(map.messages).toBe(true);
    expect(map.grades).toBe(false);
    expect(map.growth).toBe(false);
  });

  it('teacher can enable an opt-in feature for their class', async () => {
    const t = await clientFor(teacherA.email, teacherA.password);
    const { error } = await t
      .from('class_features')
      .upsert({ class_id: classA, feature: 'grades', enabled: true }, { onConflict: 'class_id,feature' });
    expect(error).toBeNull();
    const { data } = await t.from('class_features').select('enabled').eq('class_id', classA).eq('feature', 'grades').single();
    expect(data!.enabled).toBe(true);
  });

  it('a class member (parent) can READ the switches', async () => {
    const p = await clientFor(parentA.email, parentA.password);
    const { data } = await p.from('class_features').select('feature').eq('class_id', classA);
    expect((data ?? []).length).toBe(8);
  });

  it('a parent CANNOT change switches', async () => {
    const p = await clientFor(parentA.email, parentA.password);
    const { error } = await p
      .from('class_features')
      .upsert({ class_id: classA, feature: 'grades', enabled: false }, { onConflict: 'class_id,feature' });
    expect(error).toBeTruthy();
  });

  it('another teacher CANNOT change this class switches', async () => {
    const t = await clientFor(teacherB.email, teacherB.password);
    const { error } = await t
      .from('class_features')
      .upsert({ class_id: classA, feature: 'growth', enabled: true }, { onConflict: 'class_id,feature' });
    expect(error).toBeTruthy();
  });
});
