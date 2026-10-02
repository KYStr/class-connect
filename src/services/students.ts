import { supabase } from '@/lib/supabase';
import type { Student } from '@/types/domain';

type StudentRow = { id: string; class_id: string; seat: string; name: string };

function toStudent(r: StudentRow): Student {
  return { id: r.id, classId: r.class_id, seat: r.seat, name: r.name };
}

// DEVELOPMENT.md §8.2. RLS: teacher → full roster; parent → only own child.
export async function getRoster(classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, class_id, seat, name')
    .eq('class_id', classId)
    .order('seat', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as StudentRow[]).map(toStudent);
}

/** How many roster students already have ≥1 parent account bound. */
export async function countBoundStudents(classId: string): Promise<number> {
  const counts = await countGuardiansByStudent(classId);
  return [...counts.values()].filter((n) => n > 0).length;
}

/** Guardian count per student in a class (for multi-parent roster UI). */
export async function countGuardiansByStudent(classId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('guardianships')
    .select('student_id, students!inner(class_id)')
    .eq('students.class_id', classId);
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { student_id: string }[]) {
    map.set(row.student_id, (map.get(row.student_id) ?? 0) + 1);
  }
  return map;
}

export async function getMyChildren(): Promise<Student[]> {
  // RLS on students returns only children the parent guards.
  const { data, error } = await supabase
    .from('students')
    .select('id, class_id, seat, name')
    .order('seat', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as StudentRow[]).map(toStudent);
}

export async function updateStudent(
  id: string,
  input: { seat: string; name: string },
): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update({ seat: normalizeSeat(input.seat), name: input.name.trim() })
    .eq('id', id)
    .select('id, class_id, seat, name')
    .single();
  if (error) throw error;
  return toStudent(data as StudentRow);
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

/** Batch add students (SPEC 7.1 / DEVELOPMENT.md §7.1 CSV batch). Input: [{ seat, name }]. */
export async function addStudents(
  classId: string,
  rows: { seat: string; name: string }[],
): Promise<Student[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from('students')
    .insert(rows.map((r) => ({ class_id: classId, seat: r.seat, name: r.name })))
    .select('id, class_id, seat, name');
  if (error) throw error;
  return ((data ?? []) as StudentRow[]).map(toStudent);
}

/** Normalize numeric seats to 2 digits (7 → 07) so grid / single-add stay consistent. */
export function normalizeSeat(seat: string): string {
  const t = seat.trim();
  if (/^\d+$/.test(t)) return t.padStart(2, '0');
  return t;
}

/** Parse "seat,name" lines (one per row) into student rows. */
export function parseRosterCsv(text: string): { seat: string; name: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [seat, ...rest] = line.split(/[,\t]/).map((s) => s.trim());
      return { seat: normalizeSeat(seat), name: rest.join(' ').trim() };
    })
    .filter((r) => r.seat && r.name);
}
