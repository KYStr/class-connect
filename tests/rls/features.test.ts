import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, clientFor, createUser } from './helpers';

// Feature gating isolation (SPEC L16) + announcement read isolation.

describe('RLS: class_features + announcements', () => {
  const admin = adminClient();
  let teacherA: { email: string; password: string; id: string };
  let teacherB: { email: string; password: string; id: string };
  let parentA: { email: string; password: string; id: string };
  let classA: string;
  let classB: string;
  let studentA: string;
  let annA: string;

  beforeAll(async () => {
    teacherA = await createUser(admin, 'teacher', 'Teacher A');
    teacherB = await createUser(admin, 'teacher', 'Teacher B');
    parentA = await createUser(admin, 'parent', 'Parent A');

    classA = (
      await admin.from('classes').insert({ teacher_id: teacherA.id, name: 'Class A' }).select('id').single()
    ).data!.id;
    classB = (
      await admin.from('classes').insert({ teacher_id: teacherB.id, name: 'Class B' }).select('id').single()
    ).data!.id;

    studentA = (
      await admin
        .from('students')
        .insert({ class_id: classA, seat: '01', name: 'Child A' })
        .select('id')
        .single()
    ).data!.id;
    await admin.from('guardianships').insert({ student_id: studentA, parent_id: parentA.id });

    annA = (
      await admin
        .from('announcements')
        .insert({
          class_id: classA,
          author_id: teacherA.id,
          title: 'Hello',
          body: 'World',
        })
        .select('id')
        .single()
    ).data!.id;
  });

  it('new class seeds core-3 on and opt-ins off', async () => {
    const { data } = await admin.from('class_features').select('feature, enabled').eq('class_id', classA);
    const map = Object.fromEntries((data ?? []).map((r) => [r.feature, r.enabled]));
    expect(map.announcements).toBe(true);
    expect(map.contact).toBe(true);
    expect(map.messages).toBe(true);
    expect(map.grades).toBe(false);
    expect(map.growth).toBe(false);
  });

  it('teacher A can enable grades; teacher B cannot touch class A switches', async () => {
    const a = await clientFor(teacherA.email, teacherA.password);
    const { error: ok } = await a
      .from('class_features')
      .upsert({ class_id: classA, feature: 'grades', enabled: true }, { onConflict: 'class_id,feature' });
    expect(ok).toBeFalsy();

    const b = await clientFor(teacherB.email, teacherB.password);
    const { error: blocked } = await b
      .from('class_features')
      .upsert({ class_id: classA, feature: 'grades', enabled: false }, { onConflict: 'class_id,feature' });
    expect(blocked).toBeTruthy();
  });

  it('parent A can read class A feature switches but not class B', async () => {
    const p = await clientFor(parentA.email, parentA.password);
    const { data: own } = await p.from('class_features').select('feature').eq('class_id', classA);
    expect((own ?? []).length).toBeGreaterThan(0);
    const { data: other } = await p.from('class_features').select('feature').eq('class_id', classB);
    expect(other ?? []).toHaveLength(0);
  });

  it('parent A can read class A announcements; teacher B cannot', async () => {
    const p = await clientFor(parentA.email, parentA.password);
    const { data: visible } = await p.from('announcements').select('id').eq('id', annA);
    expect(visible ?? []).toHaveLength(1);

    const b = await clientFor(teacherB.email, teacherB.password);
    const { data: hidden } = await b.from('announcements').select('id').eq('id', annA);
    expect(hidden ?? []).toHaveLength(0);
  });

  it('parent can mark own read; teacher B cannot insert a read for parent A', async () => {
    const p = await clientFor(parentA.email, parentA.password);
    const { error } = await p
      .from('announcement_reads')
      .upsert({ announcement_id: annA, parent_id: parentA.id }, { onConflict: 'announcement_id,parent_id' });
    expect(error).toBeFalsy();

    const b = await clientFor(teacherB.email, teacherB.password);
    const { error: blocked } = await b
      .from('announcement_reads')
      .insert({ announcement_id: annA, parent_id: parentA.id });
    expect(blocked).toBeTruthy();
  });
});
