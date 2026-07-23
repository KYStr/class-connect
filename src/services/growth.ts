import { supabase } from '@/lib/supabase';
import type { GrowthItem, Photo } from '@/types/domain';

// DEVELOPMENT.md §8.2 / §8.3. Timeline merges notes + milestones + published grade milestones (SPEC L9).

export async function getGrowthTimeline(studentId: string): Promise<GrowthItem[]> {
  const [{ data: notes, error: nErr }, { data: ms, error: mErr }] = await Promise.all([
    supabase
      .from('performance_notes')
      .select('emoji, title, body, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    supabase
      .from('milestones')
      .select('emoji, title, body, occurred_on')
      .eq('student_id', studentId)
      .order('occurred_on', { ascending: false }),
  ]);
  if (nErr) throw nErr;
  if (mErr) throw mErr;

  // Grade milestones: published exams with a score for this student.
  const { data: scores, error: sErr } = await supabase
    .from('scores')
    .select('score, exams!inner(name, published, created_at)')
    .eq('student_id', studentId);
  if (sErr) throw sErr;

  const items: GrowthItem[] = [];
  for (const n of notes ?? []) {
    items.push({
      kind: 'note',
      emoji: n.emoji ?? '✨',
      title: n.title,
      desc: n.body ?? '',
      date: (n.created_at as string).slice(0, 10),
    });
  }
  for (const m of ms ?? []) {
    items.push({
      kind: 'milestone',
      emoji: m.emoji ?? '🌱',
      title: m.title,
      desc: m.body ?? '',
      date: m.occurred_on as string,
    });
  }
  for (const row of scores ?? []) {
    const exam = row.exams as unknown as {
      name: string;
      published: boolean;
      created_at: string;
    } | null;
    if (!exam?.published || row.score == null) continue;
    items.push({
      kind: 'grade',
      emoji: '📊',
      title: exam.name,
      desc: `得分 ${row.score} 分`,
      date: exam.created_at.slice(0, 10),
    });
  }

  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function getMemoryBookStats(
  studentId: string,
): Promise<{ photos: number; notes: number; milestones: number; latestScore: number | null }> {
  const [{ count: photos }, { count: notes }, { count: milestones }, { data: latest }] =
    await Promise.all([
      supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      supabase
        .from('performance_notes')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      supabase
        .from('milestones')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId),
      supabase
        .from('scores')
        .select('score, exams!inner(published, created_at)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false, foreignTable: 'exams' })
        .limit(20),
    ]);

  let latestScore: number | null = null;
  for (const row of latest ?? []) {
    const exam = row.exams as unknown as { published: boolean } | null;
    if (exam?.published && row.score != null) {
      latestScore = row.score as number;
      break;
    }
  }

  return {
    photos: photos ?? 0,
    notes: notes ?? 0,
    milestones: milestones ?? 0,
    latestScore,
  };
}

export async function listPhotos(studentId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('id, student_id, caption, storage_path, visibility')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as {
    id: string;
    student_id: string | null;
    caption: string | null;
    storage_path: string;
    visibility: Photo['visibility'];
  }[]).map((p) => ({
    id: p.id,
    studentId: p.student_id,
    caption: p.caption,
    storagePath: p.storage_path,
    visibility: p.visibility,
  }));
}

export async function addPerformanceNote(input: {
  classId: string;
  studentId: string;
  emoji: string;
  title: string;
  body: string;
}): Promise<void> {
  const { error } = await supabase.from('performance_notes').insert({
    class_id: input.classId,
    student_id: input.studentId,
    emoji: input.emoji,
    title: input.title,
    body: input.body || null,
  });
  if (error) throw error;
}

export async function addMilestone(input: {
  classId: string;
  studentId: string;
  emoji: string;
  title: string;
  body: string;
  occurredOn: string;
}): Promise<void> {
  const { error } = await supabase.from('milestones').insert({
    class_id: input.classId,
    student_id: input.studentId,
    emoji: input.emoji,
    title: input.title,
    body: input.body || null,
    occurred_on: input.occurredOn,
  });
  if (error) throw error;
}

export async function deletePerformanceNote(id: string): Promise<void> {
  const { error } = await supabase.from('performance_notes').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
}
