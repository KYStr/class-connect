import { supabase } from '@/lib/supabase';
import type { Class } from '@/types/domain';

type ClassRow = { id: string; name: string; office_hours: string | null };

function toClass(r: ClassRow): Class {
  return { id: r.id, name: r.name, officeHours: r.office_hours ?? '' };
}

// DEVELOPMENT.md §8.2. RLS scopes rows: teacher → own classes; parent → children's classes.
export async function getMyClasses(): Promise<Class[]> {
  const { data, error } = await supabase.from('classes').select('id, name, office_hours');
  if (error) throw error;
  return ((data ?? []) as ClassRow[]).map(toClass);
}

export async function getClass(classId: string): Promise<Class | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, office_hours')
    .eq('id', classId)
    .maybeSingle();
  if (error) throw error;
  return data ? toClass(data as ClassRow) : null;
}

export async function createClass(input: {
  name: string;
  officeHours?: string;
}): Promise<Class> {
  const { data: userData } = await supabase.auth.getUser();
  const teacherId = userData.user?.id;
  if (!teacherId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('classes')
    .insert({
      teacher_id: teacherId,
      name: input.name,
      ...(input.officeHours ? { office_hours: input.officeHours } : {}),
    })
    .select('id, name, office_hours')
    .single();
  if (error) throw error;
  return toClass(data as ClassRow);
}
