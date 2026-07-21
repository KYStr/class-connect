import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, clientFor, createUser } from './helpers';

// RLS isolation tests (AGENTS.md §5, rail 6). Requires a running local stack.
// A data feature is NOT done until its RLS test exists and passes.

describe('RLS: scores & class isolation', () => {
  const admin = adminClient();
  let teacherA: { email: string; password: string; id: string };
  let parentA: { email: string; password: string; id: string };
  let parentB: { email: string; password: string; id: string };
  let teacherB: { email: string; password: string; id: string };
  let classA: string;
  let classB: string;
  let studentA: string;
  let studentB: string;
  let examPublished: string;
  let examDraft: string;

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

    examPublished = (
      await admin.from('exams').insert({ class_id: classA, name: 'Math', published: true }).select('id').single()
    ).data!.id;
    examDraft = (
      await admin.from('exams').insert({ class_id: classA, name: 'Draft', published: false }).select('id').single()
    ).data!.id;

    await admin.from('scores').insert([
      { exam_id: examPublished, student_id: studentA, score: 90 },
      { exam_id: examPublished, student_id: studentB, score: 80 },
      { exam_id: examDraft, student_id: studentA, score: 70 },
    ]);
  });

  it('parent A cannot read parent B child score', async () => {
    const a: SupabaseClient = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('scores').select('*').eq('student_id', studentB);
    expect(data ?? []).toHaveLength(0);
  });

  it('parent A can read own child published score', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('scores').select('*').eq('student_id', studentA).eq('exam_id', examPublished);
    expect(data ?? []).toHaveLength(1);
    expect(data![0].score).toBe(90);
  });

  it('parent A cannot read own child score before exam is published', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('scores').select('*').eq('student_id', studentA).eq('exam_id', examDraft);
    expect(data ?? []).toHaveLength(0);
  });

  it('teacher B cannot manage another class (announcement insert blocked)', async () => {
    const t = await clientFor(teacherB.email, teacherB.password);
    const { error } = await t
      .from('announcements')
      .insert({ class_id: classA, title: 'x', author_id: teacherB.id });
    expect(error).toBeTruthy();
  });

  it('parent A cannot read the roster of a class they are not in', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('students').select('*').eq('class_id', classB);
    expect(data ?? []).toHaveLength(0);
  });

  it('parent A sees ONLY their own child, not classmates in the same class', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('students').select('id');
    // studentA and studentB are both in classA, but parent A guards only studentA.
    expect((data ?? []).map((r) => r.id)).toEqual([studentA]);
  });

  it('teacher A still sees the full roster of their class', async () => {
    const t = await clientFor(teacherA.email, teacherA.password);
    const { data } = await t.from('students').select('id').eq('class_id', classA);
    expect((data ?? []).map((r) => r.id).sort()).toEqual([studentA, studentB].sort());
  });
});
