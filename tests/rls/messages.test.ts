import { beforeAll, describe, expect, it } from 'vitest';
import { adminClient, clientFor, createUser } from './helpers';

describe('RLS: messages isolation', () => {
  const admin = adminClient();
  let teacherA: { email: string; password: string; id: string };
  let parentA: { email: string; password: string; id: string };
  let parentB: { email: string; password: string; id: string };
  let classA: string;
  let studentA: string;
  let studentB: string;
  let convA: string;
  let convB: string;

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

    convA = (
      await admin
        .from('conversations')
        .insert({ class_id: classA, student_id: studentA })
        .select('id')
        .single()
    ).data!.id;
    convB = (
      await admin
        .from('conversations')
        .insert({ class_id: classA, student_id: studentB })
        .select('id')
        .single()
    ).data!.id;

    await admin.from('messages').insert([
      {
        conversation_id: convA,
        sender_id: parentA.id,
        sender_role: 'parent',
        text: 'Hello from A',
      },
      {
        conversation_id: convB,
        sender_id: parentB.id,
        sender_role: 'parent',
        text: 'Hello from B',
      },
    ]);
  });

  it('parent A cannot read parent B conversation messages', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('messages').select('*').eq('conversation_id', convB);
    expect(data ?? []).toHaveLength(0);
  });

  it('parent A can read own conversation messages', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { data } = await a.from('messages').select('*').eq('conversation_id', convA);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it('parent A cannot send into parent B conversation', async () => {
    const a = await clientFor(parentA.email, parentA.password);
    const { error } = await a.from('messages').insert({
      conversation_id: convB,
      sender_id: parentA.id,
      sender_role: 'parent',
      text: 'sneaky',
    });
    expect(error).toBeTruthy();
  });

  it('teacher can read both class conversations', async () => {
    const t = await clientFor(teacherA.email, teacherA.password);
    const { data: a } = await t.from('messages').select('*').eq('conversation_id', convA);
    const { data: b } = await t.from('messages').select('*').eq('conversation_id', convB);
    expect((a ?? []).length).toBeGreaterThan(0);
    expect((b ?? []).length).toBeGreaterThan(0);
  });
});
