import { describe, it } from 'vitest';

// RLS isolation tests (AGENTS.md §5, rail 6) — the most important tests in the repo.
// These require the local Supabase stack (`supabase start` + `supabase db reset`) and seeded
// parent/teacher JWTs, wired in P1. Marked todo so `pnpm test` stays green until then.
//
// Target shape (do NOT ship a data feature without the matching passing test):
//
//   test('parent A cannot read parent B child score', async () => {
//     const a = clientFor(parentA_jwt);
//     const { data } = await a.from('scores').select('*').eq('student_id', childOfParentB.id);
//     expect(data ?? []).toHaveLength(0);
//   });
//
//   test('teacher cannot manage another class', async () => {
//     const t = clientFor(teacherX_jwt);
//     const { error } = await t.from('announcements')
//       .insert({ class_id: classOfTeacherY.id, title: 'x', author_id: teacherX.id });
//     expect(error).toBeTruthy();
//   });

describe('RLS: cross-parent isolation (P1)', () => {
  it.todo('parent A cannot read parent B child score');
  it.todo('teacher cannot manage another class');
  it.todo('parent cannot read scores before exam.published');
});
