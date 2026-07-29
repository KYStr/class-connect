import { supabase } from '@/lib/supabase';
import type { BringItem, HomeworkItem } from '@/types/domain';

// DEVELOPMENT.md §8.2 / §8.3. Contact book: homework + bring items keyed by date (SPEC L3/L11).

type HwRow = { id: string; text: string; note: string | null; due_date: string };
type BringRow = { id: string; text: string; note: string | null; due_date: string };

function toHomework(r: HwRow, done?: boolean): HomeworkItem {
  return { id: r.id, text: r.text, note: r.note, dueDate: r.due_date, done };
}

function toBring(r: BringRow): BringItem {
  return { id: r.id, text: r.text, note: r.note, dueDate: r.due_date };
}

/** Local calendar date YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function yesterdayIso(of: string = todayIso()): string {
  const d = new Date(`${of}T12:00:00`);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function listHomework(
  classId: string,
  date: string,
  studentId?: string,
): Promise<HomeworkItem[]> {
  const { data, error } = await supabase
    .from('homework_items')
    .select('id, text, note, due_date')
    .eq('class_id', classId)
    .eq('due_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as HwRow[];
  if (!studentId || rows.length === 0) return rows.map((r) => toHomework(r));

  const { data: statuses, error: sErr } = await supabase
    .from('homework_status')
    .select('homework_id, done')
    .eq('student_id', studentId)
    .in(
      'homework_id',
      rows.map((r) => r.id),
    );
  if (sErr) throw sErr;
  const doneMap = new Map((statuses ?? []).map((s) => [s.homework_id as string, Boolean(s.done)]));
  return rows.map((r) => toHomework(r, doneMap.get(r.id) ?? false));
}

export async function listBring(classId: string, date: string): Promise<BringItem[]> {
  const { data, error } = await supabase
    .from('bring_items')
    .select('id, text, note, due_date')
    .eq('class_id', classId)
    .eq('due_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as BringRow[]).map(toBring);
}

/** Teacher: how many (homework × guardian-students) are marked done today. */
export async function getHomeworkCompletion(
  classId: string,
  date: string,
): Promise<{ done: number; total: number }> {
  const { data: hw, error } = await supabase
    .from('homework_items')
    .select('id')
    .eq('class_id', classId)
    .eq('due_date', date);
  if (error) throw error;
  const hwIds = (hw ?? []).map((h) => h.id as string);
  if (hwIds.length === 0) return { done: 0, total: 0 };

  const { data: students, error: stErr } = await supabase
    .from('students')
    .select('id')
    .eq('class_id', classId);
  if (stErr) throw stErr;
  const studentCount = (students ?? []).length;
  const total = hwIds.length * studentCount;
  if (total === 0) return { done: 0, total: 0 };

  const { data: statuses, error: sErr } = await supabase
    .from('homework_status')
    .select('homework_id, student_id, done')
    .in('homework_id', hwIds)
    .eq('done', true);
  if (sErr) throw sErr;
  return { done: (statuses ?? []).length, total };
}

export async function addHomework(input: {
  classId: string;
  dueDate: string;
  text: string;
  note?: string;
}): Promise<HomeworkItem> {
  const { data, error } = await supabase
    .from('homework_items')
    .insert({
      class_id: input.classId,
      due_date: input.dueDate,
      text: input.text,
      note: input.note ?? null,
    })
    .select('id, text, note, due_date')
    .single();
  if (error) throw error;
  return toHomework(data as HwRow);
}

export async function addBring(input: {
  classId: string;
  dueDate: string;
  text: string;
  note?: string;
}): Promise<BringItem> {
  const { data, error } = await supabase
    .from('bring_items')
    .insert({
      class_id: input.classId,
      due_date: input.dueDate,
      text: input.text,
      note: input.note ?? null,
    })
    .select('id, text, note, due_date')
    .single();
  if (error) throw error;
  return toBring(data as BringRow);
}

export async function deleteHomework(id: string): Promise<void> {
  const { error } = await supabase.from('homework_items').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteBring(id: string): Promise<void> {
  const { error } = await supabase.from('bring_items').delete().eq('id', id);
  if (error) throw error;
}

export async function updateHomework(id: string, text: string): Promise<HomeworkItem> {
  const { data, error } = await supabase
    .from('homework_items')
    .update({ text })
    .eq('id', id)
    .select('id, text, note, due_date')
    .single();
  if (error) throw error;
  return toHomework(data as HwRow);
}

export async function updateBring(id: string, text: string): Promise<BringItem> {
  const { data, error } = await supabase
    .from('bring_items')
    .update({ text })
    .eq('id', id)
    .select('id, text, note, due_date')
    .single();
  if (error) throw error;
  return toBring(data as BringRow);
}

/** SPEC L11: copy yesterday's homework + bring into targetDate (replaces target day's items). */
export async function copyYesterdayContact(classId: string, targetDate: string): Promise<void> {
  const src = yesterdayIso(targetDate);
  const [hw, bring] = await Promise.all([
    listHomework(classId, src),
    listBring(classId, src),
  ]);

  // Clear target day first so "copy" is a replace, matching demo behaviour.
  await supabase.from('homework_items').delete().eq('class_id', classId).eq('due_date', targetDate);
  await supabase.from('bring_items').delete().eq('class_id', classId).eq('due_date', targetDate);

  if (hw.length > 0) {
    const { error } = await supabase.from('homework_items').insert(
      hw.map((h) => ({
        class_id: classId,
        due_date: targetDate,
        text: h.text,
        note: h.note,
      })),
    );
    if (error) throw error;
  }
  if (bring.length > 0) {
    const { error } = await supabase.from('bring_items').insert(
      bring.map((b) => ({
        class_id: classId,
        due_date: targetDate,
        text: b.text,
        note: b.note,
      })),
    );
    if (error) throw error;
  }
}

export async function toggleHomeworkDone(
  homeworkId: string,
  studentId: string,
  done: boolean,
): Promise<void> {
  const { error } = await supabase.from('homework_status').upsert(
    {
      homework_id: homeworkId,
      student_id: studentId,
      done,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'homework_id,student_id' },
  );
  if (error) throw error;
}

export interface HomeworkTrackItem {
  homeworkId: string;
  text: string;
  doneCount: number;
  totalCount: number;
  incomplete: { studentId: string; seat: string; name: string }[];
}

/** Per-homework incomplete students for teacher attention tracking. */
export async function listHomeworkTracking(
  classId: string,
  date: string,
): Promise<HomeworkTrackItem[]> {
  const [{ data: hw, error: hwErr }, { data: students, error: stErr }] = await Promise.all([
    supabase
      .from('homework_items')
      .select('id, text')
      .eq('class_id', classId)
      .eq('due_date', date)
      .order('created_at', { ascending: true }),
    supabase
      .from('students')
      .select('id, seat, name')
      .eq('class_id', classId)
      .order('seat', { ascending: true }),
  ]);
  if (hwErr) throw hwErr;
  if (stErr) throw stErr;

  const hwRows = (hw ?? []) as { id: string; text: string }[];
  const roster = (students ?? []) as { id: string; seat: string; name: string }[];
  if (hwRows.length === 0 || roster.length === 0) {
    return hwRows.map((h) => ({
      homeworkId: h.id,
      text: h.text,
      doneCount: 0,
      totalCount: roster.length,
      incomplete: roster.map((s) => ({ studentId: s.id, seat: s.seat, name: s.name })),
    }));
  }

  const { data: statuses, error: sErr } = await supabase
    .from('homework_status')
    .select('homework_id, student_id, done')
    .in(
      'homework_id',
      hwRows.map((h) => h.id),
    );
  if (sErr) throw sErr;

  const doneSet = new Set(
    (statuses ?? [])
      .filter((s) => s.done)
      .map((s) => `${s.homework_id as string}:${s.student_id as string}`),
  );

  return hwRows.map((h) => {
    const incomplete = roster.filter((s) => !doneSet.has(`${h.id}:${s.id}`));
    return {
      homeworkId: h.id,
      text: h.text,
      doneCount: roster.length - incomplete.length,
      totalCount: roster.length,
      incomplete: incomplete.map((s) => ({
        studentId: s.id,
        seat: s.seat,
        name: s.name,
      })),
    };
  });
}
