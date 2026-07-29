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
  const { data, error } = await supabase
    .from('guardianships')
    .select('student_id, students!inner(class_id)')
    .eq('students.class_id', classId);
  if (error) throw error;
  return new Set(((data ?? []) as { student_id: string }[]).map((r) => r.student_id)).size;
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

/** Parse "seat,name" lines (one per row) into student rows. */
export function parseRosterCsv(text: string): { seat: string; name: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [seat, ...rest] = line.split(/[,\t]/).map((s) => s.trim());
      return { seat, name: rest.join(' ').trim() };
    })
    .filter((r) => r.seat && r.name);
}
